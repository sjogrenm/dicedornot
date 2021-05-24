interface Weighted<T> {
  name?: string,
  weight: number,
  value: T,
}

export class Distribution {
  name: string;

  constructor(name?: string) {
    this.name = name || "";
  }

  named(name: string) {
    this.name = name;
    return this;
  }

  _flat(): Weighted<number>[] {
    throw new Error("${this.constructor}._flat() missing implementation");
  }
  get flat(): Weighted<number>[] {
    Object.defineProperty(this, 'flat', {
      value: Object.values(
        this._flat().reduce((acc: Record<string, Weighted<number>>, value) => {
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

  get expectedValue(): number {
    Object.defineProperty(
      this,
      'expectedValue',
      { value: this.flat.reduce((acc, value) => acc + (value.value.valueOf() * value.weight), 0) }
    );
    return this.expectedValue;
  }

  add(...values: Array<Distribution | number | undefined>) {
    let realValues = values.filter(value => value !== undefined) as (Distribution | number)[];
    if (realValues.length > 0) {
      return new SumDistribution([this, ...realValues]);
    } else {
      return this;
    }
  }

  product(...values: Array<Distribution | number | undefined>): Distribution {
    let realValues = values.filter(value => value !== undefined) as (Distribution | number)[];
    if (realValues.length > 0) {
      return new ProductDistribution([this, ...realValues]);
    } else {
      return this;
    }
  }

  divide(value: number | Distribution): Distribution {
    return new DivideDistribution(this, value);
  }

  subtract(value: number | Distribution): Distribution {
    return new DifferenceDistribution(this, value);
  }

  get valueString() {
    return `[${this.isSingularValue ? 'V' : 'EV'}=${this.valueOf().toFixed(2)}]`;
  }

  valueOf() {
    return this.expectedValue;
  }

  max(...rest: Distribution[]) {
    let best: Distribution = this;
    for (var next of rest) {
      if (next.expectedValue > best.expectedValue) {
        best = next;
      }
    }
    return best;
  }

  min(...rest: Distribution[]) {
    let best: Distribution = this;
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
      values.reduce((acc: Record<string, Weighted<number | Distribution>>, value) => {
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

enum DistFunction {
  add = 'add',
  subtract = 'subtract',
  product = 'product',
  divide = 'divide',
}

export class BinFuncDistribution extends Distribution {
  valFunc: (a: number, b: number) => number;
  nameFunc: (a?: string, b?: string) => string;
  distFuncName: DistFunction;
  values: Array<Distribution | number>;

  constructor(
    valFunc: (a: number, b: number) => number,
    nameFunc: (a?: string, b?: string) => string,
    distFuncName: DistFunction,
    values: Array<Distribution | number>,
    name?: string
  ) {
    super(name)
    this.valFunc = valFunc;
    this.nameFunc = nameFunc;
    this.distFuncName = distFuncName;
    this.values = values;
    console.assert(this.values.length > 0, {this: this});
  }

  _combine(a: Distribution | number, b: Distribution | number) {
    if (a instanceof Distribution) {
      switch (this.distFuncName) {
        case DistFunction.add:
        case DistFunction.product:
          return a[this.distFuncName](b);
        case DistFunction.divide:
        case DistFunction.subtract:
          if (!(typeof b === 'number')) {
            throw new Error(`Can only ${this.distFuncName} scalars`);
          }
          return a[this.distFuncName](b);
      }
    } else if (b instanceof Distribution) {
      return b[this.distFuncName](a);
    } else {
      return this.valFunc(a, b);
    }
  }

  _flat() {
    if (!this.values) {
      return [];
    }
    let flattened: Distribution;
    let [first, ...valQueue] = this.values;
    if (typeof first === 'number') {
      flattened = new SingleValue(first.toString(), first)
    } else {
      flattened = first;
    }
    for (const next of valQueue) {
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
    }
    return flattened.flat;
  }
}

export class SumDistribution extends BinFuncDistribution {
  constructor(values: Array<Distribution | number>, name?: string) {
    super((a, b) => a + b, (a, b) => `${a} + ${b}`, DistFunction.add, values, name);
  }
}

export class ProductDistribution extends BinFuncDistribution {
  constructor(values: Array<Distribution | number>, name?: string) {
    super((a, b) => a * b, (a, b) => `${a} * ${b}`, DistFunction.product, values, name);
  }
}

export class DivideDistribution extends BinFuncDistribution {
  constructor(base: Distribution, divisor: number | Distribution, name?: string) {
    super((a, b) => a / b, (a, b) => `${a} / ${b}`, DistFunction.divide, [base, divisor], name)
  }
}
export class DifferenceDistribution extends BinFuncDistribution {
  constructor(base: Distribution, subtract: number | Distribution, name?: string) {
    super((a, b) => a - b, (a, b) => `${a} - ${b}`, DistFunction.subtract, [base, subtract], name)
  }
}

export class ComparativeDistribution extends Distribution {
  values: SimpleDistribution[];
  better: (a: number, b: number) => boolean;
  constructor(better: (a: number, b: number) => boolean, values: SimpleDistribution[], name?: string) {
    super(name)
    this.better = better;
    this.values = values;
    console.assert(this.values.length > 0, {this: this});
  }

  _simple() {
    if (!this.values) {
      return new SimpleDistribution([]);
    }
    let [simplified, ...valQueue] = this.values;    

    for (const next of valQueue) {
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
    return simplified;
  }

  get simple(): SimpleDistribution {
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
