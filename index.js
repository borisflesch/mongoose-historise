const mongoose = require("mongoose");
const _ = require("lodash");

module.exports = function (schema, options) {
    // Settings
    let {
        mongooseInstance,
        mongooseModelName,
        fieldnames,
        limit,
        order,
        ignoreFields,
        preventHistoryOverride
    } = options;

    // Default settings values
    if (!mongooseInstance && !mongooseModelName) {
        throw "Parameters 'mongooseInstance' and 'mongooseModelName' required!";
    }
    const defaultFieldnames = {
        history: "history",
        modifications: "modifications",
        timestamp: "timestamp",
        field: "field",
        oldValue: "oldValue",
        newValue: "newValue"
    };
    fieldnames = fieldnames ?? defaultFieldnames;
    fieldnames.history = fieldnames.history ?? defaultFieldnames.history;
    fieldnames.modifications = fieldnames.modifications ?? defaultFieldnames.modifications;
    fieldnames.timestamp = fieldnames.timestamp ?? defaultFieldnames.timestamp;
    fieldnames.field = fieldnames.field ?? defaultFieldnames.field;
    fieldnames.oldValue = fieldnames.oldValue ?? defaultFieldnames.oldValue;
    fieldnames.newValue = fieldnames.newValue ?? defaultFieldnames.newValue;

    limit = Number(limit) ?? false;
    order = (order == -1 || order == 1) ? order : -1;
    ignoreFields = ignoreFields ?? ['updatedAt', fieldnames.history];
    preventHistoryOverride = Boolean(preventHistoryOverride) ?? true;


    // Add Historise fields to schema
    const fieldModification = new mongoose.Schema({
        [fieldnames.field]: String,
        [fieldnames.oldValue]: mongoose.Schema.Types.Mixed,
        [fieldnames.newValue]: mongoose.Schema.Types.Mixed
    }, { _id: false });

    const modifications = new mongoose.Schema({
        [fieldnames.modifications]: [fieldModification],
        [fieldnames.timestamp]: { type: Date, default: Date.now() }
    }, { _id: false });

    schema.add({
        [fieldnames.history]: [modifications] // Dynamic key name
    });


    // On document save, historise modifications
    schema.pre('save', async function (next) {
        if (this.isModified("createdAt")
            || (schema.options.versionKey
                && typeof this[schema.options.versionKey] === "undefined")) {
            next(); // Skip on document creation
        } else {
            try {
                // Retrieve modified fields
                const modifiedFields = this.directModifiedPaths();

                // Current version in MongoDB (i.e. old)
                const old = await mongooseInstance.model(mongooseModelName).findById(this._id);

                // Historise modifications
                const modifications = [];
                for (const modifiedField of modifiedFields) {
                    if (ignoreFields.includes(modifiedField)) {
                        continue;
                    }

                    modifications.push({
                        [fieldnames.field]: modifiedField,
                        [fieldnames.oldValue]: _.get(old, modifiedField),
                        [fieldnames.newValue]: _.get(this, modifiedField)
                    });
                }

                // Prevent manual overwrite of modifications (i.e. overwrite provided 'history' field)
                if (preventHistoryOverride) {
                    this[fieldnames.history] = old[fieldnames.history];
                }

                // Store modifications (if there are any)
                if (modifications.length > 0) {
                    if (order == 1) {
                        // Last modifications at the end
                        this[fieldnames.history].push({
                            [fieldnames.modifications]: modifications,
                            [fieldnames.timestamp]: Date.now()
                        });

                        // Keep max `limit` last modifications
                        if (limit && this[fieldnames.history].length > limit) {
                            this[fieldnames.history] = this[fieldnames.history].slice(this[fieldnames.history].length - limit, this[fieldnames.history].length);
                        }
                    } else {
                        // Last modifications at the beginning
                        this[fieldnames.history].unshift({
                            [fieldnames.modifications]: modifications,
                            [fieldnames.timestamp]: Date.now()
                        });

                        // Keep max `limit` last modifications
                        if (limit && this[fieldnames.history].length > limit) {
                            this[fieldnames.history] = this[fieldnames.history].slice(0, limit);
                        }
                    }
                }

                next();
            } catch (error) {
                next(error);
            }
        }
    });
};