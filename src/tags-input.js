const escapeStringRegexp = require('escape-string-regexp');

module.exports = tagsInput;

const BACKSPACE = 8,
	TAB = 9,
	ENTER = 13,
	LEFT = 37,
	RIGHT = 39,
	DELETE = 46;

const COPY_PROPS = ['autocomplete', 'disabled', 'readonly', 'type'];
const MOVE_PROPS = [
	'accept',
	'accesskey',
	'autocapitalize',
	'autofocus',
	'dir',
	'inputmode',
	'lang',
	'list',
	'max',
	'maxlength',
	'min',
	'minlength',
	'pattern',
	'placeholder',
	'size',
	'spellcheck',
	'step',
	'tabindex',
	'title',
	'value'
];

function checkerForSeparator(separator) {
	function simple(separator) {
		return {
			split: s => s.split(separator),
			join: arr => arr.join(separator),
			test: char => char === separator
		};
	}

	function multi(separators) {
		let regex = separators
			.split('')
			.map(escapeStringRegexp)
			.join('|');

		regex = new RegExp(regex);

		return {
			split: s => s.split(regex),
			join: arr => arr.join(separators[0]),
			test: char => regex.test(char)
		};
	}

	return separator.length > 1 ? multi(separator) : simple(separator);
}

function createElement(type, name, text, attributes) {
	let el = document.createElement(type);
	if (name) el.className = name;
	if (text) el.textContent = text;
	for (let key in attributes) {
		el.setAttribute(`data-${key}`, attributes[key]);
	}
	return el;
}

function insertAfter(child, el) {
	return child.nextSibling ?
		child.parentNode.insertBefore(el, child.nextSibling) :
		child.parentNode.appendChild(el);
}

function caretAtStart(el) {
	try {
		return el.selectionStart === 0 && el.selectionEnd === 0;
	}
	catch(e) {
		return el.value === '';
	}
}

function charFromKeyboardEvent(e) {
	if ('key' in e) {
		// most modern browsers
		return e.key;
	}
	if ('keyIdentifier' in e) {
		// Safari < 10
		return String.fromCharCode(parseInt(event.keyIdentifier.slice(2), 16));
	}
	// other old/non-conforming browsers
	return e.char;
}

const eachNode = 'forEach' in NodeList.prototype ?
	(nodeList, fn) => nodeList.forEach(fn) :
	(nodeList, fn) => { for(let i = 0; i < nodeList.length; i++) fn(nodeList[i]); };

function tagsInput(input) {

	function $(selector) {
		return base.querySelector(selector);
	}

	function $$(selector) {
		return base.querySelectorAll(selector);
	}

	function getValue() {
		let value = [];
		if (base.input.value) value.push(base.input.value);
		eachNode($$('.tag'), t => value.push(t.textContent));
		return checker.join(value);
	}

	function setValue(value) {
		eachNode($$('.tag'), t => base.removeChild(t));
		savePartialInput(value, true);
	}

	function save(init) {
		input.value = getValue();
		if (init) {
		    return;
		}
		input.dispatchEvent(new Event('change'));
	}

	function checkAllowDuplicates() {
		const allow =
			input.getAttribute('data-allow-duplicates') ||
			input.getAttribute('duplicates');
		return allow === 'on' || allow === '1' || allow === 'true';
	}

	// Return false if no need to add a tag
	function addTag(text) {
	    var added = false;
		function addOneTag(text) {
			let tag = text && text.trim();
			// Ignore if text is empty
			if (!tag) return;

			// Check input validity (eg, for pattern=)
			// At tags-input init fill the base.input
			base.input.value = text;
			if (!base.input.checkValidity()) {
				base.classList.add('error');
				setTimeout( () => base.classList.remove('error') , 150);
				return;
			}

			// For duplicates, briefly highlight the existing tag
			if (!allowDuplicates) {
				let exisingTag = $(`[data-tag="${tag}"]`);
				if (exisingTag) {
					exisingTag.classList.add('dupe');
					setTimeout( () => exisingTag.classList.remove('dupe') , 100);
					return;
				}
			}

			base.insertBefore(
				createElement('span', 'tag', tag, { tag }),
				base.input
			);
			added = true;
		}

		// Add multiple tags if the user pastes in data with SEPERATOR already in it
		checker.split(text).forEach(addOneTag);
		return added;
	}

	function select(el) {
		let sel = $('.selected');
		if (sel) sel.classList.remove('selected');
		if (el) el.classList.add('selected');
	}

	function savePartialInput(value, init) {
		if (typeof value!=='string' && !Array.isArray(value)) {
			// If the base input does not contain a value, default to the original element passed
			value = base.input.value;
		}
		if (addTag(value)!==false) {
			base.input.value = '';
			save(init);
		}
	}

	function refocus(e) {
		base.input.focus();
		if (e.target.classList.contains('tag')) select(e.target);
		if (e.target===base.input) return select();
		e.preventDefault();
		return false;
	}

	const base = createElement('div', 'tags-input'),
		checker = checkerForSeparator(input.getAttribute('data-separator') || ','),
		allowDuplicates = checkAllowDuplicates();

	insertAfter(input, base);
	base.appendChild(input);

	let inputType = input.getAttribute('type');
	if (!inputType || inputType === 'tags') {
		input.setAttribute('type', 'text');
	}
	base.input = createElement('input');
	COPY_PROPS.forEach( prop => {
		if (input.hasAttribute(prop)) {
			base.input.setAttribute(prop, input.getAttribute(prop));
		}
	});
	MOVE_PROPS.forEach( prop => {
		if (input.hasAttribute(prop)) {
			base.input.setAttribute(prop, input.getAttribute(prop));
			input.removeAttribute(prop);
		}
	});
	base.appendChild(base.input);

	input.setAttribute('type', 'text');
	input.tabIndex = -1;

	input.addEventListener('focus', () => {
		base.input.focus();
	});

	base.input.addEventListener('focus', () => {
		base.classList.add('focus');
		select();
	});

	base.input.addEventListener('blur', () => {
		base.classList.remove('focus');
		select();
		savePartialInput();
	});

	base.input.addEventListener('keydown', e => {
		let el = base.input,
			key = e.keyCode || e.which,
			separator = checker.test(charFromKeyboardEvent(e)),
			selectedTag = $('.tag.selected'),
			lastTag = $('.tag:last-of-type');

		if (key===ENTER || key===TAB || separator) {
			if (!el.value && !separator) return;
			savePartialInput();
		}
		else if (key===DELETE && selectedTag) {
			if (selectedTag!==lastTag) select(selectedTag.nextSibling);
			base.removeChild(selectedTag);
			save();
		}
		else if (key===BACKSPACE) {
			if (selectedTag) {
				select(selectedTag.previousSibling);
				base.removeChild(selectedTag);
				save();
			}
			else if (lastTag && caretAtStart(el)) {
				select(lastTag);
			}
			else {
				return;
			}
		}
		else if (key===LEFT) {
			if (selectedTag) {
				if (selectedTag.previousSibling) {
					select(selectedTag.previousSibling);
				}
			}
			else if (!caretAtStart(el)) {
				return;
			}
			else {
				select(lastTag);
			}
		}
		else if (key===RIGHT) {
			if (!selectedTag) return;
			select(selectedTag.nextSibling);
		}
		else {
			return select();
		}

		e.preventDefault();
		return false;
	});

	// Proxy "input" (live change) events , update the first tag live as the user types
	// This means that users who only want one thing don't have to enter commas
	base.input.addEventListener('input', () => {
		input.value = getValue();
		input.dispatchEvent(new Event('input'));
	});

	// One tick after pasting, parse pasted text as CSV:
	base.input.addEventListener('paste', () => setTimeout(savePartialInput, 0));

	base.addEventListener('mousedown', refocus);
	base.addEventListener('touchstart', refocus);

	base.setValue = setValue;
	base.getValue = getValue;

	// Add tags for existing values
	savePartialInput(input.value, true);
}

// make life easier:
tagsInput.enhance = tagsInput.tagsInput = tagsInput;
