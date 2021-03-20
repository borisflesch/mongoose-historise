# mongoose-historise

![License](https://img.shields.io/npm/l/mongoose-historise)
![Version](https://img.shields.io/npm/v/mongoose-historise)

![Star](https://img.shields.io/github/stars/borisflesch/mongoose-historise?style=social)
![Watch](https://img.shields.io/github/watchers/borisflesch/mongoose-historise?style=social)
![Fork](https://img.shields.io/github/forks/borisflesch/mongoose-historise?style=social)

Keep track of modifications history of your documents!


## Install & Test

```
$> npm i mongoose-historise
$> npm test
```

## Why mongoose-historise?

Historise helps you keeping track of modifications within a document of any of your collections.

Unlike several Mongoose versioning plugins which duplicates a document to store it as an archive when it is updated, **mongoose-historise stores a history of the modified fields directly within the document itself**.

Example of a new "Movie" document:

```js
{
  _id: 6055282e4992b599b0874155,
  castOverview: [ 'Daniel Radcliffe', 'Rupert Grint', 'Richard Harris' ],
  title: "Harry Potter and the Sorcerer's Stone",
  duration: '2h32min',
  director: 'Chris Columbus',
  summary: 'An orphaned boy enrolls in a school of wizardry, where he learns the truth about himself, his family and the terrible evil that haunts the magical world.',
  releaseDate: 2001-11-16T00:00:00.000Z,
  history: [],
  __v: 0
}
```

After updating some fields (e.g. 'duration' and 'castOverview') and saving the document, the 'history' is automatically updated as follows:

```js
{
  _id: 6055282e4992b599b0874155,
  castOverview: [ 'Daniel Radcliffe', 'Rupert Grint', 'Richard Harris', 'Maggie Smith' ],
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


## Quick Start

> **WARNING**: mongoose-historise can generate history only on 'save' operation due to Mongoose limitations. If you want to use it, please use 'save' instead of 'update' operations to properly historise modifications made to your documents.

When creating your Mongoose Model, simply add mongoose-historise plugin (more options available in the section below):

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

schema.plugin(historise, { mongooseInstance: mongoose, mongooseModelName: "Movie", });

const Movie = mongoose.model("Movie", schema);
module.exports = Movie;
```


## Options

Currently, the following options are available for mongoose-historise (default values indicated, only 'mongooseInstance' and 'mongooseModelName' are required):

```js
{
    // Mongoose instance, required to interact with your Mongoose model
    mongooseInstance: mongoose,
    // Name of your model (string)
    mongooseModelName: "Model",
    // Names of all fields in which history will be stored (see history structure below)
    fieldnames: {
        history: "history",
        modifications: "modifications",
        timestamp: "timestamp",
        field: "field",
        oldValue: "oldValue",
        newValue: "newValue"
    },
    limit: false, // False: no history limits; fill-in a number to indicate the maximum number of 'history' to store
    order: -1, // -1: Reverse chronological order (last modifications at the beginning); 1: Chronological order (last modifications at the end)
    ignore: ['createdAt', 'history'] // Ignore the mentioned fields when generating and storing the history
}
```

## History structure

The history of a document is automatically generated based on fields that have been modified when saving a document. This plugin adds the following structure to your Mongoose Model:

```js
{
    history: [
        {
            timestamp: Date
            modifications: [
                {
                    field: String, // Name of the field modified (also works with deep/nested fields)
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
