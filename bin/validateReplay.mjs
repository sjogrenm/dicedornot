#!/usr/bin/env node

// const fs = require('fs');
// const io = require('../src/io.js');
// const Ajv = require("ajv")
import {readFileSync, existsSync} from 'fs';
import {xmlToJson} from '../build/io.mjs';
import Ajv from 'ajv';
import betterAjvErrors from 'better-ajv-errors';
import fs from 'fs';

const ajv = new Ajv.default({allowUnionTypes: true});

const schema = JSON.parse(readFileSync('bin/replayStep.json'));


// import validate from '../src/BB2Replay.validator.js';
// import type * as BB2 from '../src/BB2Replay.js';

async function _validate() {
    const validate = ajv.compile(schema);
    for (const filename of process.argv.slice(2)) {
        let buffer = readFileSync(filename, {flag: 'r'});
        buffer.name = filename;
        let jsonCacheName = `${filename}.json`;
        let zipContents;
        if (existsSync(jsonCacheName)) {
            console.log(`Loading from cache ${jsonCacheName}...`);
            zipContents = JSON.parse(readFileSync(jsonCacheName, {flag: 'r'}));
        } else {
            console.log(`Parsing ${filename}...`);
            zipContents = await xmlToJson(buffer);
            fs.writeFile(jsonCacheName, JSON.stringify(zipContents, null, 2), (err) => {console.log(err)});
        }
        for (const [replayName, replay] of Object.entries(zipContents)) {
            for (const replayStep of replay.Replay.ReplayStep) {
                const valid = validate(replayStep);
                if (!valid) {
                    console.log(betterAjvErrors(schema, replayStep, validate.errors, {indent: 2, format: 'cli'}).split('\n\n').slice(-1).join('\n\n'));
                    throw `Error found in replayStep:\n${JSON.stringify(replayStep, null, 2)}\nIn '${filename}'`;
                }
            }
        }
    }
}
_validate().catch(err => {console.log(err)});