const Provider = require('./Provider');

/** @extends Provider */
class SQLiteProvider extends Provider {
    /**
     * Provider using the `sqlite` library.
     * @param {Database|Promise<Database>} db - SQLite database from `sqlite`.
     * @param {string} tableName - Name of table to handle.
     * @param {ProviderOptions} [options={}] - Options to use.
     */
    constructor(db, tableName, options = {}) {
        super();

        /**
         * SQLite database.
         * @type {Database}
         */
        this.db = db;

        /**
         * Name of the table.
         * @type {string}
         */
        this.tableName = tableName;

        /**
         * Column for ID.
         * @type {string}
         */
        this.idColumn = options.idColumn || 'id';

        /**
         * Column for JSON data.
         * @type {?string}
         */
        this.dataColumn = options.dataColumn;
    }

    /**
     * Initializes the provider.
     * @returns {Promise<void>}
     */
    init() {
        return Promise.resolve(this.db).then(db => {
            this.db = db;
            return this.db.all(`SELECT * FROM ${this.tableName}`).then(rows => {
                for (const row of rows) {
                    this.items.set(row[this.idColumn], this.dataColumn ? JSON.parse(row[this.dataColumn]) : row);
                }
            });
        });
    }

    /**
     * Gets a value.
     * @param {string} id - ID of entry.
     * @param {string} key - The key to get.
     * @param {any} [defaultValue] - Default value if not found or null.
     * @returns {any}
     */
    get(id, key, defaultValue) {
        if (this.items.has(id)) {
            const value = this.items.get(id)[key];
            return value == null ? defaultValue : value;
        }

        return defaultValue;
    }

    /**
     * Sets a value.
     * @param {string} id - ID of entry.
     * @param {string} key - The key to set.
     * @param {any} value - The value.
     * @returns {Promise<Statement>}
     */
    set(id, key, value) {
        const data = this.items.get(id) || {};
        data[key] = value;
        this.items.set(id, data);

        if (this.dataColumn) {
            return this.db.run(`REPLACE INTO ${this.tableName} (${this.idColumn}, ${this.dataColumn}) VALUES ($id, $value)`, {
                $id: id,
                $value: JSON.stringify(data)
            });
        }

        return this.db.run(`REPLACE INTO ${this.tableName} (${this.idColumn}, ${key}) VALUES ($id, $value)`, {
            $id: id,
            $value: value
        });
    }

    /**
     * Deletes a value.
     * @param {string} id - ID of entry.
     * @param {string} key - The key to delete.
     * @returns {Promise<Statement>}
     */
    delete(id, key) {
        const data = this.items.get(id) || {};
        delete data[key];

        if (this.dataColumn) {
            return this.db.run(`REPLACE INTO ${this.tableName} (${this.idColumn}, ${this.dataColumn}) VALUES ($id, $value)`, {
                $id: id,
                $value: JSON.stringify(data)
            });
        }

        return this.db.run(`REPLACE INTO ${this.tableName} (${this.idColumn}, ${key}) VALUES ($id, $value)`, {
            $id: id,
            $value: null
        });
    }

    /**
     * Clears an entry.
     * @param {string} id - ID of entry.
     * @returns {Promise<Statement>}
     */
    clear(id) {
        this.items.delete(id);
        return this.db.run(`DELETE FROM ${this.tableName} WHERE ${this.idColumn} = $id`, { $id: id });
    }
}

module.exports = SQLiteProvider;
