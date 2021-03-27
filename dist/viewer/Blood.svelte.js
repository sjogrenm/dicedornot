import './Blood.svelte.css';
/* src/viewer/Blood.svelte generated by Svelte v3.35.0 */
import {
	SvelteComponent,
	attr,
	detach,
	element,
	init,
	insert,
	noop,
	null_to_empty,
	safe_not_equal
} from "../../_snowpack/pkg/svelte/internal.js";

function create_fragment(ctx) {
	let div;
	let div_class_value;

	return {
		c() {
			div = element("div");
			attr(div, "class", div_class_value = "" + (null_to_empty(`blood sprite splatter${/*blood*/ ctx[0]}`) + " svelte-158ype2"));
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*blood*/ 1 && div_class_value !== (div_class_value = "" + (null_to_empty(`blood sprite splatter${/*blood*/ ctx[0]}`) + " svelte-158ype2"))) {
				attr(div, "class", div_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { blood } = $$props;

	$$self.$$set = $$props => {
		if ("blood" in $$props) $$invalidate(0, blood = $$props.blood);
	};

	return [blood];
}

class Blood extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { blood: 0 });
	}
}

export default Blood;