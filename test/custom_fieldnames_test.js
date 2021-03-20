const assert = require("assert");
const mongoose = require("mongoose");
const _ = require("lodash");
const historise = require("./../index");

// Movie model
const schema = new mongoose.Schema({
    title: String,
    duration: String,
    cast: [String],
    releaseDate: Date,
});

schema.plugin(historise, {
    mongooseInstance: mongoose, // Mongoose instance (to fetch model)
    mongooseModelName: "Movie", // Model that will be used by the plugin,
    fieldnames: { // Custom fieldnames (test with French names)
        history: "historique",
        modifications: "amendements",
        timestamp: "horodatage",
        field: "champ",
        oldValue: "ancienneValeur",
        newValue: "nouvelleValeur"
    },
});

mongoose.models = {}; // Remove existing models
const Movie = mongoose.model("Movie", schema);
let movie = null;

// Tests
describe('Test with custom fieldnames', () => {
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
        assert(Array.isArray(movie.historique));
        assert(movie.historique.length === 0);
    });

    it('Adds a single-field modification to history', async () => {
        movie.duration = "2:32";
        movie = await movie.save();
        assert(movie.historique.length === 1);
        assert(movie.historique[0].horodatage instanceof Date);
        assert(Array.isArray(movie.historique[0].amendements));
        assert(movie.historique[0].amendements.length === 1);
        assert(movie.historique[0].amendements[0].champ === "duration");
        assert(movie.historique[0].amendements[0].ancienneValeur === "2h32min");
        assert(movie.historique[0].amendements[0].nouvelleValeur === "2:32");
    });

    it('Adds another two-fields modification to history', async () => {
        movie.duration = "2h32'";
        movie.cast.push('Maggie Smith');

        movie = await movie.save();
        assert(movie.historique.length === 2);
        assert(movie.historique[0].amendements.length === 2);

        assert(movie.historique[0].amendements[0].champ === "duration");
        assert(movie.historique[0].amendements[0].ancienneValeur === "2:32");
        assert(movie.historique[0].amendements[0].nouvelleValeur === "2h32'");

        assert(movie.historique[0].amendements[1].champ === "cast");
        assert(_.isEqual(movie.historique[0].amendements[1].ancienneValeur, ['Daniel Radcliffe', 'Rupert Grint', 'Richard Harris']));
        assert(_.isEqual(movie.historique[0].amendements[1].nouvelleValeur, ['Daniel Radcliffe', 'Rupert Grint', 'Richard Harris', 'Maggie Smith']));
    });

    it('Added second modification before the first one (i.e. reverse chronological order)', (done) => {
        assert(movie.historique[0].horodatage > movie.historique[1].horodatage);
        done();
    });

    it('Adds modifications without limit (random title)', async () => {
        for (let i = 0; i < 20; i++) {
            const oldTitle = movie.title;
            const newTitle = Math.random().toString(36).substring(7);
            movie.title = newTitle;

            movie = await movie.save();
            assert(movie.historique.length === i + 3);
            assert(movie.historique[0].amendements.length === 1);

            assert(movie.historique[0].amendements[0].champ === "title");
            assert(movie.historique[0].amendements[0].ancienneValeur === oldTitle);
            assert(movie.historique[0].amendements[0].nouvelleValeur === newTitle);
        }
    });
});