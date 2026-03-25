/* 

   Contact: https://wa.me/2347036214381
   Telegram: https://t.me/Ednut_x    
   Developer : https://wa.me/2348102487241
  
*/

require('../config');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Client } = require('pg');

let DataBase;
const dbUrl = process.env.DATABASE_URL;

if (dbUrl?.startsWith('mongodb')) {
  // ✅ MongoDB Version
  DataBase = class MongoDB {
    constructor(url = dbUrl, options = { useNewUrlParser: true, useUnifiedTopology: true }) {
      this.url = url;
      this.options = options;
      this.data = {};
      this.isMongo = true;
      this.isPostgres = false;
      this.isJson = false;
    }

    async read() {
      await mongoose.connect(this.url, this.options);
      const schema = new mongoose.Schema({ data: Object }, { versionKey: false });
      this._model = mongoose.models.db || mongoose.model('db', schema);
      let record = await this._model.findOne();
      if (!record) record = await new this._model({ data: {} }).save();
      this.data = record;
      return this.data.data || {};
    }

    async write(data) {
      if (!this.data || !this.data._id) return;
      await this._model.findByIdAndUpdate(this.data._id, { data });
    }

    async close() {
      await mongoose.connection?.close();
    }
  };

} else if (dbUrl?.startsWith('postgres')) {
  // ✅ PostgreSQL Version
  DataBase = class PostgresDB {
    constructor(url = dbUrl) {
      this.url = url;
      this.client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
      });
      this.connected = false;
      this.table = 'bot_data';
      this.isMongo = false;
      this.isPostgres = true;
      this.isJson = false;
    }

    async connectOnce() {
      if (!this.connected) {
        await this.client.connect();
        this.connected = true;
        await this.client.query(`
          CREATE TABLE IF NOT EXISTS ${this.table} (
            id SERIAL PRIMARY KEY,
            data JSONB
          );
        `);
      }
    }

    async read() {
      await this.connectOnce();
      const res = await this.client.query(`SELECT data FROM ${this.table} ORDER BY id LIMIT 1`);
      if (res.rows.length === 0) {
        await this.client.query(`INSERT INTO ${this.table}(data) VALUES ($1)`, [{}]);
        return {};
      }
      return res.rows[0].data || {};
    }

    async write(data) {
      await this.connectOnce();
      await this.client.query(
        `UPDATE ${this.table} SET data = $1 WHERE id = (SELECT id FROM ${this.table} ORDER BY id LIMIT 1)`,
        [data]
      );
    }

    async close() {
      if (this.connected) {
        await this.client.end();
        this.connected = false;
      }
    }
  };

} else {
  // ✅ JSON Fallback (for local dev)
  DataBase = class JsonDB {
    constructor() {
      this.file = path.join(process.cwd(), 'all/database/database.json');
      this.data = {};
      this.isMongo = false;
      this.isPostgres = false;
      this.isJson = true;
    }

    async read() {
      if (fs.existsSync(this.file)) {
        this.data = JSON.parse(fs.readFileSync(this.file));
      } else {
        fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
      }
      return this.data;
    }

    async write(data) {
      this.data = data;
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    }

    async close() {
      // No cleanup needed for local file
    }
  };
}

module.exports = DataBase;