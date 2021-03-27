const assert = require("assert");
const mongoose = require("mongoose");
const _ = require("lodash");
const historise = require("../index");

// Movie model
const schema = new mongoose.Schema({
    title: String,
    duration: String,
    cast: [String],
    releaseDate: Date,
});

schema.plugin(historise, {
    mongooseInstance: mongoose, // Mongoose instance (to fetch model)
    mongooseModelName: "Movie", // Model that will be used by the plugin
    order: 1, // chronological order
});

mongoose.models = {}; // Remove existing models
const Movie = mongoose.model("Movie", schema);
let movie = null;

// Tests
describe('Test chronological order history', () => {
    it('Drops database', (done) => {
        mongoose.connection.db.dropDatabase(() => {
            done();
        });
    });

    it('Adds history field to a new document', async () => {
        //assertion is not included in mocha so 
        //require assert which was installed along with mocha
        movie = new Movie({
            title: "Harry Potter and the Sorcerer's Stone",
            duration: '2h32min',
            director: 'Chris Columbus',
            releaseDate: "2001-11-16",
            cast: ['Daniel Radcliffe', 'Rupert Grint', 'Richard Harris'],
        });

        movie = await movie.save();
        assert(Array.isArray(movie.history));
        assert(movie.history.length === 0);
    });

    it('Adds a single-field modification to history', async () => {
        movie.duration = "2:32";
        movie = await movie.save();
        assert(movie.history.length === 1);
        assert(movie.history[0].timestamp instanceof Date);
        assert(Array.isArray(movie.history[0].modifications));
        assert(movie.history[0].modifications.length === 1);
        assert(movie.history[0].modifications[0].field === "duration");
        assert(movie.history[0].modifications[0].oldValue === "2h32min");
        assert(movie.history[0].modifications[0].newValue === "2:32");
    });

    it('Adds another two-fields modification to history', async () => {
        movie.duration = "2h32'";
        movie.cast.push('Maggie Smith');

        movie = await movie.save();
        assert(movie.history.length === 2);
        assert(movie.history[1].modifications.length === 2);

        assert(movie.history[1].modifications[0].field === "duration");
        assert(movie.history[1].modifications[0].oldValue === "2:32");
        assert(movie.history[1].modifications[0].newValue === "2h32'");

        assert(movie.history[1].modifications[1].field === "cast");
        assert(_.isEqual(movie.history[1].modifications[1].oldValue, ['Daniel Radcliffe', 'Rupert Grint', 'Richard Harris']));
        assert(_.isEqual(movie.history[1].modifications[1].newValue, ['Daniel Radcliffe', 'Rupert Grint', 'Richard Harris', 'Maggie Smith']));
    });

    it('Added second modification after the first one (i.e. chronological order)', (done) => {
        assert(movie.history[1].timestamp > movie.history[0].timestamp);
        done();
    });

    it('Adds modifications without limit (random title)', async () => {
        for (let i = 0; i < 20; i++) {
            const oldTitle = movie.title;
            const newTitle = Math.random().toString(36).substring(7);
            movie.title = newTitle;

            movie = await movie.save();
            assert(movie.history.length === i + 3);
            assert(movie.history[i + 2].modifications.length === 1);

            assert(movie.history[i + 2].modifications[0].field === "title");
            assert(movie.history[i + 2].modifications[0].oldValue === oldTitle);
            assert(movie.history[i + 2].modifications[0].newValue === newTitle);
        }
    });

    it('Runs following test file', () => {
        require('./3_limit_chronological_test');
    });
});