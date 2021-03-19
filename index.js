import mongoose, { Schema } from "mongoose";
import _ from "lodash";

module.exports = function (schema, options) {
    // Settings
    let {
        mongooseModel,
        fieldnames,
        limit,
        order,
        ignoreFields,
        preventHistoryOverride
    } = options;

    // Default settings values
    if (!mongooseModel) {
        throw "Missing required parameter 'mongooseModel'";
    }
    fieldnames.history =  fieldnames.history ?? "history";
    fieldnames.timestamp =  fieldnames.timestamp ?? "timestamp";
    fieldnames.field =  fieldnames.field ?? "field";
    fieldnames.oldValue =  fieldnames.oldValue ?? "oldValue";
    fieldnames.newValue =  fieldnames.newValue ?? "newValue";

    limit = Number(limit) ?? null;
    order = (order == -1 || order == 1) ? order : -1;
    ignoreFields = ignoreFields ?? ['updatedAt', fieldnames.history];
    preventHistoryOverride = Boolean(preventHistoryOverride) ?? true;


    // Add Historise fields to schema
    const fieldModification = new Schema({
        [fieldnames.field]: String,
        [fieldnames.oldValue]: Schema.Types.Mixed,
        [fieldnames.newValue]: Schema.Types.Mixed
    }, { _id: false });

    const modifications = new Schema({
        [fieldnames.modifications]: [fieldModification],
        [fieldnames.timestamp]: { type: Date, default: Date.now() }
    }, { _id: false });

    schema.add({
        [fieldnames.history]: [modifications] // Dynamic key name
    });


    // On document save, historise modifications
    schema.pre('save', async function (next) {
        if (this.isModified("createdAt")) {
            next(); // Skip on document creation
        } else {
            try {
                // Retrieve modified fields
                const modifiedFields = this.directModifiedPaths();

                // Current version in MongoDB (i.e. old)
                const old = await mongoose.model(options.mongooseModel).findById(this._id);

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
                            this[fieldnames.history] = this[fieldnames.history].slice(limit, this[fieldnames.history].length);
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