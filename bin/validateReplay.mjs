#!/usr/bin/env node

// const fs = require('fs');
// const io = require('../src/io.js');
// const Ajv = require("ajv")
import {readFileSync, open} from 'fs';
import {xmlToJson} from '../build/io.mjs';
import Ajv from 'ajv';
import betterAjvErrors from 'better-ajv-errors';

const ajv = new Ajv.default({allowUnionTypes: true});

const schema = JSON.parse(readFileSync('bin/replayStep.json'));


// import validate from '../src/BB2Replay.validator.js';
// import type * as BB2 from '../src/BB2Replay.js';

async function _validate() {
    const validate = ajv.compile(schema);
    for await (const replay of xmlToJson(readFileSync(process.argv[2], {flag: 'r'}))) {
        for (const replayStep of replay.Replay.ReplayStep) {
            const valid = validate(replayStep);
            if (!valid) {
                console.log(betterAjvErrors(schema, replayStep, validate.errors, {indent: 2}));
                break;
            }
        }
    }
}
_validate().catch(err => {console.log(err)});