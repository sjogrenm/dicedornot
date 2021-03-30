function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

interface Weighted<T> {
  name: string,
  weight: number,
  value: T,
}

export class Distribution {
  name: string;

  constructor(name?: string) {
    this.name = name;
  }

  named(name) {
    this.name = name;
    return this;
  }

  _flat(): Weighted<number>[] {
    throw new Error("${this.constructor}._flat() missing implementation");
  }
  get flat(): Weighted<number>[] {
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
      { value: this.flat.reduce((acc, value) => acc + (value.value.valueOf() * value.weight), 0) }
    );
    return this.expectedValue;
  }

  add(...values: Array<Distribution | number>) {
    values = values.filter(value => value !== null);
    if (values.length > 0) {
      return new SumDistribution([this, ...values]);
    } else {
      return this;
    }
  }

  product(...values: Array<Distribution | number>): Distribution {
    values = values.filter(value => value !== null);
    if (values.length > 0) {
      return new ProductDistribution([this, ...values]);
    } else {
      return this;
    }
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
  values: Weighted<number | Distribution>[];
  constructor(values: Weighted<Distribution | number>[], name?: string) {
    super(name)
    const totalWeight = values.map(value => value.weight).reduce((a, b) => a + b, 0);
    values.forEach(value => {
      value.weight /= totalWeight;
    });
    this.values = Object.values(
      values.reduce((acc, value) => {
        const existing = acc[`${value.name}`];
        if (existing) {
          if (existing.value != value.value) {
            throw new Error(`Inconsistent values passed to SimpleDistribution. ${existing.value.valueOf()} != ${value.value.valueOf()} when adding '${value.name}'`);
          }
          existing.weight += value.weight;
        } else {
          acc[`${value.name}`] = value;
        }
        return acc;
      }, {})
    );
    console.assert(this.values.length > 0, {this: this});
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
      return value as Weighted<number>;
    })
  }
}

export class SingleValue extends Distribution {
  value: number | Distribution;
  constructor(name: string, value: number | Distribution) {
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
  valFunc: (a: number, b: number) => number;
  nameFunc: (a: string, b: string) => string;
  distFuncName: string;
  values: Array<Distribution | number>;

  constructor(
    valFunc: (a: number, b: number) => number,
    nameFunc: (a: string, b: string) => string,
    distFuncName: string,
    values: Array<Distribution | number>,
    name?: string
  ) {
    super(name)
    this.valFunc = valFunc;
    this.nameFunc = nameFunc;
    this.distFuncName = distFuncName;
    if (!isIterable(values)) {
      throw new Error("values not iterable");
    }
    this.values = values;
    console.assert(this.values.length > 0, {this: this});
  }

  _combine(a: Distribution | number, b: Distribution | number) {
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
              (next as Distribution).flat.map(nextVal => (
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
                name: this.name || this.nameFunc(value.name, next.toString()),
                value: this.valFunc(value.value, next.valueOf()),
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
              this.name || this.nameFunc(flattened, next.toString()),
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
  constructor(values: Array<Distribution | number>, name?: string) {
    super((a, b) => a + b, (a, b) => `${a} + ${b}`, 'add', values, name);
  }
}

export class ProductDistribution extends BinFuncDistribution {
  constructor(values: Array<Distribution | number>, name?: string) {
    super((a, b) => a * b, (a, b) => `${a} * ${b}`, 'product', values, name);
  }
}

export class DivideDistribution extends BinFuncDistribution {
  constructor(base: Distribution, divisor: number, name?: string) {
    super((a, b) => a / b, (a, b) => `${a} / ${b}`, 'divide', [base, divisor], name)
  }
}
export class DifferenceDistribution extends BinFuncDistribution {
  constructor(base, subtract, name?: string) {
    super((a, b) => a - b, (a, b) => `${a} - ${b}`, 'subtract', [base, subtract], name)
  }
}

export class ComparativeDistribution extends Distribution {
  values: Array<SimpleDistribution>;
  better: (a: number, b: number) => boolean;
  constructor(better: (a: number, b: number) => boolean, values: Array<SimpleDistribution>, name) {
    super(name)
    if (!isIterable(values)) {
      throw new Error("values not iterable");
    }
    this.better = better;
    this.values = values;
    console.assert(this.values.length > 0, {this: this});
  }

  _simple() {
    const valQueue = [...this.values];
    var simplified: SimpleDistribution = null;

    while (valQueue.length > 0) {
      var next = valQueue.shift();
      if (!simplified) {
        simplified = next;
      } else {
        simplified = new SimpleDistribution(simplified.values.flatMap(fVal => (
          next.values.map(nextVal => (
            {
              name: this.better(fVal.value.valueOf(), nextVal.value.valueOf()) ? fVal.name : nextVal.name,
              weight: fVal.weight * nextVal.weight,
              value: this.better(fVal.value.valueOf(), nextVal.value.valueOf()) ? fVal.value : nextVal.value,
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
  constructor(values: Array<SimpleDistribution>, name?: string) {
    super((a: number, b: number) => a > b, values, name);
  }
}
export class MinDistribution extends ComparativeDistribution {
  constructor(values: Array<SimpleDistribution>, name?: string) {
    super((a: number, b: number) => a < b, values, name);
  }
}
