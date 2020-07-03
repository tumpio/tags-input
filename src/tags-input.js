const KEY_ENTER = 13,
    KEY_ESC = 27,
    KEY_LEFT = 37,
    KEY_RIGHT = 39,
    KEY_DELETE = 46;

export class TagsInput {
    constructor(input) {
        this.root = document.createElement("div");
        this.tags = document.createElement("div");
        this.input = document.createElement("input");
        this.root.className = "tags-input";
        this.tags.className = "tags";
        this.checker = checkerForSeparator(input.getAttribute("data-separator"));

        copyAttributes(input, this.input);

        this.input.addEventListener("focus", () => {
            this.root.classList.add("focus");
            this.select();
        });

        this.input.addEventListener("blur", () => {
            if (this.$(".tag.editing")) {
                return;
            }
            this.root.classList.remove("focus");
            this.select();
            this.saveInput();
        });

        this.input.addEventListener("paste", () => setTimeout(this.saveInput.bind(this), 0));
        this.input.addEventListener("keydown", (e) => this.handleInput(e));
        this.root.addEventListener("mousedown", (e) => this.onFocus(e));
        this.root.addEventListener("touchstart", (e) => this.onFocus(e));

        this.tags.addEventListener("keydown", (e) => {
            let key = e.keyCode,
                separator = this.checker.test(e.key),
                editedTag = e.target;
            if (key === KEY_ENTER || separator) {
                this.saveEditedTag(editedTag);
            } else if (key == KEY_ESC) {
                this.input.focus();
            } else {
                return;
            }
            e.preventDefault();
            return false;
        });

        this.tags.addEventListener("focusout", (e) => {
            let editedTag = e.target;
            if (!this.saveEditedTag(editedTag)) {
                editedTag.textContent = editedTag.dataset.tag;
                this.select();
            }
        });

        input.tabIndex = -1;
        input.after(this.root);
        this.root.appendChild(input);
        this.root.appendChild(this.tags);
        this.root.appendChild(this.input);
    }

    $(selector) {
        return this.root.querySelector(selector);
    }

    $$(selector) {
        return this.root.querySelectorAll(selector);
    }

    get value() {
        return Array.from(this.$$(".tag"), (t) => t.dataset.tag);
    }

    set value(tags) {
        if (!tags) {
            return;
        }

        if (typeof tags === "string") {
            tags = [tags];
        }

        let fragment = document.createDocumentFragment();
        let span = document.createElement("span");
        span.className = "tag";

        while (this.tags.hasChildNodes()) {
            this.tags.removeChild(this.tags.lastChild);
        }

        for (let tag of tags) {
            let node = span.cloneNode(false);
            node.textContent = tag;
            node.dataset.tag = tag;
            fragment.appendChild(node);
        }

        this.tags.appendChild(fragment);
    }

    get disabled() {
        return this.input.disabled;
    }

    set disabled(value) {
        this.input.disabled = value;
    }

    addTag(value, editedTag) {
        let tag = value && value.trim();
        if (!tag) {
            return false;
        }

        if (!this.input.checkValidity()) {
            if (!editedTag) {
                this.root.classList.add("error");
                setTimeout(() => this.root.classList.remove("error"), 150);
            } else {
                editedTag.classList.add("error");
                setTimeout(() => editedTag.classList.remove("error"), 100);
            }
            return false;
        }

        // For duplicates, briefly highlight the existing tag
        let duplicate = this.$(`[data-tag="${tag}"]`);
        if (duplicate) {
            duplicate.classList.add("duplicate");
            setTimeout(() => duplicate.classList.remove("duplicate"), 100);
            return false;
        }

        if (editedTag) {
            editedTag.dataset.tag = tag;
            editedTag.textContent = tag;
        } else {
            let element = document.createElement("span");
            element.className = "tag";
            element.textContent = tag;
            element.dataset.tag = tag;

            let before = this.getElementBefore(tag);

            if (before != null) {
                this.tags.insertBefore(element, before);
            } else {
                this.tags.appendChild(element);
            }
        }
        return true;
    }

    saveInput() {
        let added = this.checker
            .split(this.input.value)
            .map((t) => this.addTag(t))
            .includes(true);

        if (added) {
            this.input.value = "";
            this.notify();
        }
        return added;
    }

    saveEditedTag(tag) {
        if (tag.textContent === tag.dataset.tag) {
            this.select();
            return true;
        }
        if (!tag.textContent) {
            this.tags.removeChild(tag);
            this.notify();
            this.input.focus();
            return true;
        }
        // use input field temporarely for tag validation
        let input = this.input.value;
        this.input.value = tag.textContent;
        let added = this.addTag(tag.textContent, tag);
        if (added) {
            this.select();
            this.notify();
            this.input.focus();
        }
        this.input.value = input;
        return added;
    }

    onFocus(e) {
        if (e.target.classList.contains("tag")) {
            if (e.target.classList.contains("selected")) {
                e.target.classList.add("editing");
                return;
            } else {
                // focus base.input to capture input
                this.input.focus();
            }
            this.select(e.target);
            e.preventDefault();
            return false;
        } else if (e.target === this.input) {
            this.select();
        }
    }

    handleInput(e) {
        let key = e.keyCode,
            separator = this.checker.test(e.key),
            selectedTag = this.$(".tag.selected"),
            lastTag = this.$(".tag:last-of-type");

        if (key === KEY_ENTER && selectedTag) {
            selectedTag.classList.add("editing");
            selectedTag.focus();
        } else if (key === KEY_ENTER || separator) {
            this.saveInput();
        } else if (key === KEY_DELETE && selectedTag) {
            if (selectedTag !== lastTag) this.select(selectedTag.nextSibling);
            this.tags.removeChild(selectedTag);
            this.notify();
        } else if (key === KEY_LEFT) {
            if (selectedTag && selectedTag.previousSibling) {
                this.select(selectedTag.previousSibling);
            } else if (caretAtStart(this.input)) {
                this.select(lastTag);
            } else {
                return;
            }
        } else if (key === KEY_RIGHT && selectedTag) {
            this.select(selectedTag.nextSibling);
        } else {
            return this.select();
        }

        e.preventDefault();
        return false;
    }

    select(el) {
        let sel = this.$(".selected");
        if (sel) {
            sel.classList.remove("selected");
            sel.classList.remove("editing");
            sel.blur();
            sel.removeAttribute("contenteditable");
        }
        if (el) {
            el.classList.add("selected");
            el.setAttribute("contenteditable", "true");
        }
    }

    notify() {
        this.input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    getElementBefore(tag) {
        for (let element of this.$$(".tag")) {
            if (tag < element.dataset.tag) {
                return element;
            }
        }
        return null;
    }
}

const COPY_ATTRIBUTES = ["autocomplete", "disabled", "readonly", "type"];
const MOVE_ATTRIBUTES = [
    "accept",
    "accesskey",
    "autocapitalize",
    "autofocus",
    "dir",
    "inputmode",
    "lang",
    "list",
    "max",
    "maxlength",
    "min",
    "minlength",
    "pattern",
    "placeholder",
    "size",
    "spellcheck",
    "step",
    "tabindex",
    "title",
];

function copyAttributes(from, to) {
    COPY_ATTRIBUTES.forEach((attr) => {
        if (from.hasAttribute(attr)) {
            to.setAttribute(attr, from.getAttribute(attr));
        }
    });

    MOVE_ATTRIBUTES.forEach((attr) => {
        if (from.hasAttribute(attr)) {
            to.setAttribute(attr, from.getAttribute(attr));
            from.removeAttribute(attr);
        }
    });
}

const REGEX_OPERATORS = /[|\\{}()[\]^$+*?.]/g;

function escapeRegexpOperators(str) {
    return str.replace(REGEX_OPERATORS, "\\$&");
}

function checkerForSeparator(separator) {
    function noSeparator() {
        return {
            split: (s) => (!s || !s.trim() ? [] : [s]),
            join: (arr) => arr.join(""),
            test: () => false,
        };
    }

    function simple(separator) {
        return {
            split: (s) => (!s || !s.trim() ? [] : s.split(separator)),
            join: (arr) => arr.join(separator),
            test: (char) => char === separator,
        };
    }

    function multi(separators) {
        let regex = separators.split("").map(escapeRegexpOperators).join("|");

        regex = new RegExp(regex);

        return {
            split: (s) => (!s || !s.trim() ? [] : s.split(regex)),
            join: (arr) => arr.join(separators[0]),
            test: (char) => regex.test(char),
        };
    }

    if (!separator) {
        return noSeparator();
    }

    return separator.length > 1 ? multi(separator) : simple(separator);
}

function caretAtStart(el) {
    try {
        return el.selectionStart === 0 && el.selectionEnd === 0;
    } catch (e) {
        return el.value === "";
    }
}
