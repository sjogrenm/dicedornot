function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

export class Distribution {
  constructor(name) {
    this.name = name;
  }

  named(name) {
    this.name = name;
    return this;
  }

  _flat() {
    throw new Error("${this.constructor}._flat() missing implementation");
  }
  get flat() {
    Object.defineProperty(this, 'flat', {
      value: Object.values(
        this._flat().reduce((acc, value) => {
          const existing = acc[`${value.name}-${value.value}`];
          if (existing) {
            existing.weight += value.weight;
          } else {
            acc[`${value.name}-${value.value}`] = value;
          }
          return acc;
        }, {})
      )
    })
    return this.flat;
  }

  get singularValue() {
    const flattened = this.flat;
    if (flattened.length > 1) {
      throw new Error("Distribution doesn't have a singular value");
    }
    return flattened[0].value;
  }

  get expectedValue() {
    return this.flat.reduce((acc, value) => acc + (value.value * value.weight), 0);
  }

  add(...values) {
    return new SumDistribution([this, ...values]);
  }

  product(...values) {
    return new ProductDistribution([this, ...values]);
  }

  divide(value) {
    return new BinFuncDistribution((a, b) => a / b, (a, b) => `${a} / ${b}`, [this, value]);
  }
}

export class SimpleDistribution extends Distribution {
  constructor(values, name) {
    super(name)
    const totalWeight = values.map(value => value.weight).reduce((a, b) => a + b);
    values.forEach(value => {
      value.weight /= totalWeight;
    });
    this.values = values;
  }
  _flat() {
    return this.values.flatMap(value => {
      if (value.value instanceof Distribution) {
        return value.value.flat.map(subvalue => ({
          name: `${value.name} \u2192 ${subvalue.name}`,
          weight: value.weight * subvalue.weight,
          value: subvalue.value,
        }))
      }
      return value;
    })
  }
}

export class SingleValue extends Distribution {
  constructor(name, value) {
    super(name)
    this.value = value;
  }

  _flat() {
    if (this.value instanceof Distribution) {
      return this.value.flat.map(subvalue => ({
        name: `${this.name} \u2192 ${subvalue.name}`,
        weight: subvalue.weight,
        value: subvalue.value,
      }))
    }
    return [{
      name: this.name,
      weight: 1,
      value: this.value,
    }];
  }
}

export class BinFuncDistribution extends Distribution {
  constructor(valFunc, nameFunc, values, name) {
    super(name)
    this.valFunc = valFunc;
    this.nameFunc = nameFunc;
    if (!isIterable(values)) {
      throw new Error("values not iterable", values);
    }
    if (values.length == 0) {
      throw new Error("empty values list", values);
    }
    this.values = values;
  }

  _flat() {
    const valQueue = [...this.values];
    var flattened = null;
    while (valQueue.length > 0) {
      var next = valQueue.shift();
      if (!flattened) {
        flattened = next;
      } else {
        if (flattened instanceof Distribution) {
          if (next instanceof Distribution) {
            flattened = new SimpleDistribution(flattened.flat.flatMap(fVal => (
              next.flat.map(nextVal => (
                {
                  name: this.name || this.nameFunc(fVal.name, nextVal.name),
                  weight: fVal.weight * nextVal.weight,
                  value: this.valFunc(fVal.value, nextVal.value),
                })
              )
            )), this.name);
          } else {
            flattened = new SimpleDistribution(flattened.flat.map(value => (
              {
                name: this.name || this.nameFunc(value.name, next),
                value: this.valFunc(value.value, next),
                weight: value.weight
              }
            )), this.name);
          }
        } else {
          if (next instanceof Distribution) {
            flattened = new SimpleDistribution(next.flat.map(value => (
              {
                name: this.name || this.nameFunc(flattened, value.name),
                value: this.valFunc(flattened, value.value),
                weight: value.weight
              }
            )), this.name);
          } else {
            flattened = new SingleValue(
              this.name || this.nameFunc(flattened, next),
              this.valFunc(flattened, next),
            )
          }
        }
      }
    }
    return flattened.flat;
  }
}

export class SumDistribution extends BinFuncDistribution {
  constructor(values, name) {
    super((a, b) => a + b, (a, b) => `${a} + ${b}`, values, name);
  }
}

export class ProductDistribution extends BinFuncDistribution {
  constructor(values, name) {
    super((a, b) => a * b, (a, b) => `${a} * ${b}`, values, name);
  }
}

export class MaxDistribution extends Distribution {
  constructor(values, name) {
    super(name)
    if (!isIterable(values)) {
      throw new Error("values not iterable", values);
    }
    if (values.length == 0) {
      throw new Error("empty values list", values);
    }
    this.values = values;
  }

  _flat() {
    const valQueue = [...this.values];
    var flattened = null;
    while (valQueue.length > 0) {
      var next = valQueue.shift();
      if (!flattened) {
        flattened = next;
      } else {
        if (flattened instanceof Distribution) {
          if (next instanceof Distribution) {
            flattened = new SimpleDistribution(flattened.flat.flatMap(fVal => (
              next.flat.map(nextVal => (
                {
                  name: fVal.value > nextVal.value ? fVal.name : nextVal.name,
                  weight: fVal.weight * nextVal.weight,
                  value: fVal.value > nextVal.value ? fVal.value : nextVal.value,
                })
              )
            )));
          } else {
            flattened = new SimpleDistribution(flattened.flat.map(value => {
              value.name = value.value > next ? value.name : next;
              value.value = value.value > next ? value.value : next;
              return value;
            }));
          }
        } else {
          if (next instanceof Distribution) {
            flattened = new SimpleDistribution(next.flat.map(value => {
              value.name = value.value > flattened ? value.name : flattened;
              value.value = value.value > flattened ? value.value : flattened;
              return value;
            }));
          } else {
            flattened = new SingleValue(
              flattened > next ? flattened : next,
              flattened > next ? flattened : next,
            )
          }
        }
      }
    }
    return flattened.flat;
  }
}

export class MinDistribution extends Distribution {
  constructor(values, name) {
    super(name)
    if (!isIterable(values)) {
      throw new Error("values not iterable", values);
    }
    if (values.length == 0) {
      throw new Error("empty values list", values);
    }
    this.values = values;
  }

  _flat() {
    const valQueue = [...this.values];
    var flattened = null;
    while (valQueue.length > 0) {
      var next = valQueue.shift();
      if (!flattened) {
        flattened = next;
      } else {
        if (flattened instanceof Distribution) {
          if (next instanceof Distribution) {
            flattened = new SimpleDistribution(flattened.flat.flatMap(fVal => (
              next.flat.map(nextVal => (
                {
                  name: fVal.value < nextVal.value ? fVal.name : nextVal.name,
                  weight: fVal.weight * nextVal.weight,
                  value: fVal.value < nextVal.value ? fVal.value : nextVal.value,
                })
              )
            )));
          } else {
            flattened = new SimpleDistribution(flattened.flat.map(value => {
              value.name = value.value < next ? value.name : next;
              value.value = value.value < next ? value.value : next;
              return value;
            }));
          }
        } else {
          if (next instanceof Distribution) {
            flattened = new SimpleDistribution(next.flat.map(value => {
              value.name = value.value < flattened ? value.name : flattened;
              value.value = value.value < flattened ? value.value : flattened;
              return value;
            }));
          } else {
            flattened = new SingleValue(
              flattened < next ? flattened : next,
              flattened < next ? flattened : next,
            )
          }
        }
      }
    }
    return flattened.flat;
  }
}
