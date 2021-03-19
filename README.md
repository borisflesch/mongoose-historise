# mongoose-historise

![License](https://img.shields.io/npm/l/mongoose-historise)
![Version](https://img.shields.io/npm/v/mongoose-historise)

![Star](https://img.shields.io/github/stars/borisflesch/mongoose-historise?style=social)
![Watch](https://img.shields.io/github/watchers/borisflesch/mongoose-historise?style=social)
![Fork](https://img.shields.io/github/forks/borisflesch/mongoose-historise?style=social)

Keep track of modifications history of your documents!


## What does mongoose-historise do?

Historise helps you keep track of modifications within a document of any of your collections.

Example of a new "Movie" document:

```js
{
  castOverview: [ 'Daniel Radcliffe', 'Rupert Grint', 'Richard Harris' ],
  _id: 6055282e4992b599b0874155,
  title: "Harry Potter and the Sorcerer's Stone",
  duration: '2h32min',
  director: 'Chris Columbus',
  summary: 'An orphaned boy enrolls in a school of wizardry, where he learns the truth about himself, his family and the terrible evil that haunts the magical world.',
  releaseDate: 2001-11-16T00:00:00.000Z,
  history: [],
  __v: 0
}
```

After updating some fields (e.g. 'duration' and 'castOverview'), the 'history' is automatically updated as follows:

```js
{
  castOverview: [ 'Daniel Radcliffe', 'Rupert Grint', 'Richard Harris', 'Maggie Smith' ],
  _id: 6055282e4992b599b0874155,
  title: "Harry Potter and the Sorcerer's Stone",
  duration: '2:32',
  director: 'Chris Columbus',
  summary: 'An orphaned boy enrolls in a school of wizardry, where he learns the truth about himself, his family and the terrible evil that haunts the magical world.',
  releaseDate: 2001-11-16T00:00:00.000Z,
  history: [
    {
      timestamp: 2021-03-19T22:40:30.499Z,
      modifications: [
        { field: 'duration', oldValue: '2h32min', newValue: '2:32' },
        {
          field: 'castOverview',
          oldValue: [ 'Daniel Radcliffe', 'Rupert Grint', 'Richard Harris' ],
          newValue: [ 'Daniel Radcliffe', 'Rupert Grint', 'Richard Harris', 'Maggie Smith' ]
        }
      ]
    }
  ],
  __v: 1
}
```


## Basic usage

> **WARNING**: mongoose-historise can generated history only on 'save' operation due to Mongoose 'pre' hooks limitations. If you want to use it, please replace 'update' operations by 'save' to make it work properly.

When creating your Mongoose Model, simply add mongoose-historise plugin:

```js
const mongoose = require("mongoose");
const historise = require("mongoose-historise");

const schema = new mongoose.Schema({
    title: String,
    duration: String,
    director: String,
    castOverview: [String],
    summary: String,
    releaseDate: Date,
});

schema.plugin(historise, {
    mongooseInstance: mongoose,
    mongooseModelName: "Movie",
    fieldnames: {
        history: "history",
        modifications: "modifications",
        timestamp: "timestamp",
        field: "field",
        oldValue: "oldValue",
        newValue: "newValue"
    },
    limit: 5,
    order: -1,
});

const Movie = mongoose.model("Movie", schema);

module.exports = Movie;
```


## Options

Currently, the following options are available for mongoose-historise (default values are indicated):

```js
{
    // mongoose instance, required to use & update history of your model
    mongooseInstance: mongoose,
    // Name of your model (string)
    mongooseModelName: "Model",
    // Names of all fields in which history will be stored (see history structure below)
    fieldnames: { // Name
        history: "history",
        modifications: "modifications",
        timestamp: "timestamp",
        field: "field",
        oldValue: "oldValue",
        newValue: "newValue"
    },
    limit: false, // False: no history limits; fill-in a number to indicate the maximum number of 'history' to store
    order: -1, // -1: last modifications will appear at the beginning of the array; 1: last modifications will appear at the end
    ignore: ['createdAt', 'history'] // Ignore the mentioned fields when generating and storing the history
}
```

## History structure

The History of a document is automatically generated based on fields that have been modified when saving a document. It adds the following structure to your Mongoose Model:

```js
{
    history: [
        {
            timestamp: Date
            modifications: [
                {
                    field: String, // Name of the field modified (works with deep/nested fields)
                    oldValue: Mixed, // Previous value of that field
                    newValue: Mixed // New value of that field
                },
                ... // All fields modified during the same 'save' operation
            ]
        },
        ... // New item added on each 'save' (if fields have been modified)
    ]
}
```

You can edit the name of all these history structure's fields using the options above.


## Issues & Features requests

If you encounter any bug/issue or would like new features to be added please feel free to open an issue on GitHub.
