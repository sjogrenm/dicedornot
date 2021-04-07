#!/usr/bin/env node

const fs = require('fs');
const io = require('../src/io.js');
const validator = require('../src/BB2Replay.validator.js');
// import {readFileSync} from 'fs';
// import {xmlToJson} from '../src/io.js';
// import validate from '../src/BB2Replay.validator.js';
// import type * as BB2 from '../src/BB2Replay.js';

async function _validate() {
    for await (const replay of xmlToJson(readFileSync(process.argv[2], 'utf8'))) {
        validate(replay.Replay);
    }
}
_validate();