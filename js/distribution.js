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

  get cdf() {
    Object.defineProperty(this, 'cdf', {
      value: this.flat.sort(
        (a, b) => a.value - b.value
      ).reduce(
        (cdf, result) => {
          cdf.push({
            weight: cdf[cdf.length - 1].weight + result.weight,
            value: result.value,
          });
          return cdf;
        }
      )
    })
  }

  sample() {
    var target = Math.random();
    for (const result of this.flat) {
      if (result.weight > target) {
        return result.value;
      } else {
        target -= result.weight;
      }
    }
    return this.flat[this.flat.length - 1].value;
  }

  get singularValue() {
    const flattened = this.flat;
    if (flattened.length > 1) {
      throw new Error("Distribution doesn't have a singular value");
    }
    return flattened[0].value;
  }

  get isSingularValue() {
    return this.flat.length == 1;
  }

  get expectedValue() {
    Object.defineProperty(
      this,
      'expectedValue',
      { value: this.flat.reduce((acc, value) => acc + (value.value * value.weight), 0) }
    );
    return this.expectedValue;
  }

  add(...values) {
    return new SumDistribution([this, ...values]);
  }

  product(...values) {
    return new ProductDistribution([this, ...values]);
  }

  divide(value) {
    return new DivideDistribution(this, value);
  }

  subtract(value) {
    return new DifferenceDistribution(this, value);
  }

  get valueString() {
    return `[${this.isSingularValue ? 'V' : 'EV'}=${this.valueOf().toFixed(2)}]`;
  }

  valueOf() {
    return this.expectedValue;
  }

  max(...rest) {
    var best = this;
    for (var next of rest) {
      if (next.expectedValue > best.expectedValue) {
        best = next;
      }
    }
    return best;
  }

  min(...rest) {
    var best = this;
    for (var next of rest) {
      if (next.expectedValue < best.expectedValue) {
        best = next;
      }
    }
    return best;
  }

}

export class SimpleDistribution extends Distribution {
  constructor(values, name) {
    super(name)
    const totalWeight = values.map(value => value.weight).reduce((a, b) => a + b);
    values.forEach(value => {
      value.weight /= totalWeight;
    });
    this.values = Object.values(
      values.reduce((acc, value) => {
        const existing = acc[`${value.name}`];
        if (existing) {
          if (existing.value != value.value) {
            throw new Error("Inconsistent values passed to SimpleDistribution")
          }
          existing.weight += value.weight;
        } else {
          acc[`${value.name}`] = value;
        }
        return acc;
      }, {})
    )
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
  constructor(valFunc, nameFunc, distFuncName, values, name) {
    super(name)
    this.valFunc = valFunc;
    this.nameFunc = nameFunc;
    this.distFuncName = distFuncName;
    if (!isIterable(values)) {
      throw new Error("values not iterable", values);
    }
    if (values.length == 0) {
      throw new Error("empty values list", values);
    }
    this.values = values;
  }

  _combine(a, b) {
    if (a instanceof Distribution) {
      return a[this.distFuncName](b);
    } else if (b instanceof Distribution) {
      return b[this.distFuncName](a);
    } else {
      return this.valFunc(a, b);
    }
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
    super((a, b) => a + b, (a, b) => `${a} + ${b}`, 'add', values, name);
  }
}

export class ProductDistribution extends BinFuncDistribution {
  constructor(values, name) {
    super((a, b) => a * b, (a, b) => `${a} * ${b}`, 'product', values, name);
  }
}

export class DivideDistribution extends BinFuncDistribution {
  constructor(base, divisor, name) {
    super((a, b) => a / b, (a, b) => `${a} / ${b}`, 'divide', [base, divisor], name)
  }
}
export class DifferenceDistribution extends BinFuncDistribution {
  constructor(base, subtract, name) {
    super((a, b) => a - b, (a, b) => `${a} - ${b}`, 'subtract', [base, subtract], name)
  }
}

export class ComparativeDistribution extends Distribution {
  constructor(better, values, name) {
    super(name)
    if (!isIterable(values)) {
      throw new Error("values not iterable", values);
    }
    if (values.length == 0) {
      throw new Error("empty values list", values);
    }
    this.better = better;
    this.values = values;
  }

  _simple() {
    const valQueue = [...this.values];
    var simplified = null;

    while (valQueue.length > 0) {
      var next = valQueue.shift();
      if (!simplified) {
        simplified = next;
      } else {
        if (!((simplified instanceof SimpleDistribution) && (next instanceof SimpleDistribution))) {
          throw new Error("Can only compare simple distributions")
        }
        simplified = new SimpleDistribution(simplified.values.flatMap(fVal => (
          next.values.map(nextVal => (
            {
              name: this.better(fVal.value, nextVal.value) ? fVal.name : nextVal.name,
              weight: fVal.weight * nextVal.weight,
              value: this.better(fVal.value, nextVal.value) ? fVal.value : nextVal.value,
            })
          )
        )));
      }
    }
    return simplified;
  }

  get simple() {
    Object.defineProperty(this, 'simple', {
      value: this._simple().named(this.name)
    })
    console.assert(Math.abs(this.simple.expectedValue - this.expectedValue) < 0.0001, this);
    return this.simple;
  }

  _flat() {
    return this._simple().flat;
  }
}

export class MaxDistribution extends ComparativeDistribution {
  constructor(values, name) {
    super((a, b) => a > b, values, name);
  }
}
export class MinDistribution extends ComparativeDistribution {
  constructor(values, name) {
    super((a, b) => a < b, values, name);
  }
}
