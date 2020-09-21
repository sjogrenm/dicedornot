//import _ from "underscore";

export const ATTACKER_DOWN = "AD";
export const BOTH_DOWN = "BD";
export const PUSH = "P";
export const DEFENDER_STUMBLES = "DS";
export const DEFENDER_DOWN = "DD";

export const D6 = die([1, 2, 3, 4, 5, 6]);

export const D8 = die([1, 2, 3, 4, 5, 6, 7, 8]);

export const BLOCK = die([
  ATTACKER_DOWN,
  BOTH_DOWN,
  PUSH,
  PUSH,
  DEFENDER_STUMBLES,
  DEFENDER_DOWN,
]);

export const TWO_DIE_BLOCK = dice([BLOCK, BLOCK]);

function unique(values) {
  var us = [];
  var already_in;
  for (const value of values) {
    already_in = false;
    for (const existing of us) {
      already_in = already_in || _.isEqual(value, existing);
    }
    if (!already_in) {
      us.push(value);
    }
  }
  return us;
}

function die(values) {
  return {
    values: values,
    range: unique(values),
  };
}

function dice(to_roll, combine) {
  combine = combine || append;
  var values = to_roll.shift().values;
  for (const die of to_roll) {
    var new_values = [];
    for (const existing of values) {
      for (const value of die.values) {
        new_values.push(combine(existing, value));
      }
    }
    values = new_values;
  }
  return die(values);
}

function append(existing, value) {
  if (typeof existing == "array") {
    return [value] + existing;
  } else {
    return [existing, value];
  }
}
