const KEY_ENTER = "Enter",
    KEY_ESC = "Escape",
    KEY_LEFT = "ArrowLeft",
    KEY_RIGHT = "ArrowRight",
    KEY_DELETE = "Delete";

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

const REGEX_OPERATORS = /[$()*+.?[\\\]^{|}]/g;

export class TagsInput extends HTMLInputElement {
    constructor() {
        super();

        const div = document.createElement("div");

        this.tagsNode = document.createElement("div");
        this.input = document.createElement("input");

        div.className = "tags-input";
        this.tagsNode.className = "tags";
        this.checker = checkerForSeparator(this.getAttribute("data-separator"));
        this.editOnly = this.dataset.editOnly === "true"; // disables tag select mode

        copyAttributes(this, this.input);

        this.input.addEventListener("focus", () => {
            div.classList.add("focus");
            this.select();
        });

        this.addEventListener("focus", () => this.input.focus());

        this.input.addEventListener("blur", () => {
            if (this.tagsNode.querySelector(".editing")) {
                return;
            }
            div.classList.remove("focus");
            this.select();
            this.saveInput();
        });

        this.addEventListener("blur", () => this.input.blur());

        this.input.addEventListener("paste", () => setTimeout(this.saveInput.bind(this), 0));
        this.input.addEventListener("keydown", (e) => this.handleInput(e));
        div.addEventListener("mousedown", (e) => this.onFocus(e));
        div.addEventListener("touchstart", (e) => this.onFocus(e));

        this.tagsNode.addEventListener("keydown", (e) => {
            const { key, target } = e,
                separator = this.checker.test(key);
            if (key === KEY_ENTER || separator) {
                this.saveEditedTag(target);
            } else if (key === KEY_ESC) {
                this.input.focus();
            } else {
                return;
            }
            e.preventDefault();
            return false;
        });

        this.tagsNode.addEventListener("focusout", (e) => {
            const editedTag = e.target;
            if (!this.saveEditedTag(editedTag)) {
                editedTag.textContent = editedTag.dataset.tag;
                this.select();
            }
        });

        this.tabIndex = -1;
        this.after(div);
        div.append(this, this.tagsNode, this.input);
    }

    get tags() {
        return Array.from(this.tagsNode.childNodes, (t) => t.dataset.tag);
    }

    set tags(tags) {
        if (!tags) {
            return;
        }

        if (typeof tags === "string") {
            tags = [tags];
        }

        const fragment = document.createDocumentFragment();
        const span = document.createElement("span");
        span.className = "tag";
        span.classList.toggle("editing", this.editOnly);
        span.setAttribute("contenteditable", this.editOnly);

        while (this.tagsNode.hasChildNodes()) {
            this.tagsNode.lastChild.remove();
        }

        tags.forEach((tag) => {
            const node = span.cloneNode(false);
            node.textContent = tag;
            node.dataset.tag = tag;
            fragment.appendChild(node);
        });

        this.tagsNode.appendChild(fragment);
        this.value = tags.join();
    }

    static get observedAttributes() {
        return ["disabled"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "disabled") {
            this.input.disabled = newValue !== null;
        }
    }

    addTag(value, editedTag) {
        const tag = value && value.trim();
        if (!tag) {
            return false;
        }

        if (!this.input.checkValidity()) {
            if (!editedTag) {
                this.parentNode.classList.add("error");
                setTimeout(() => this.parentNode.classList.remove("error"), 150);
            } else {
                editedTag.classList.add("error");
                setTimeout(() => editedTag.classList.remove("error"), 100);
            }
            return false;
        }

        // For duplicates, briefly highlight the existing tag
        const duplicate = this.tagsNode.querySelector(`[data-tag="${tag}"]`);
        if (duplicate) {
            duplicate.classList.add("duplicate");
            setTimeout(() => duplicate.classList.remove("duplicate"), 100);
            return false;
        }

        if (editedTag) {
            editedTag.dataset.tag = tag;
            editedTag.textContent = tag;
        } else {
            const element = document.createElement("span");
            element.className = "tag";
            element.textContent = tag;
            element.dataset.tag = tag;
            element.classList.toggle("editing", this.editOnly);
            element.setAttribute("contenteditable", this.editOnly);

            const before = this.getElementBefore(tag);

            if (before != null) {
                this.tagsNode.insertBefore(element, before);
            } else {
                this.tagsNode.appendChild(element);
            }
        }
        return true;
    }

    saveInput() {
        const added = this.checker
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
            tag.remove();
            this.notify();
            this.input.focus();
            return true;
        }
        // use input field temporarely for tag validation
        const input = this.input.value;
        this.input.value = tag.textContent;
        const added = this.addTag(tag.textContent, tag);
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
            if (this.editOnly) {
                return;
            }
            if (e.target.classList.contains("selected")) {
                e.target.classList.add("editing");
                return;
            }
            // focus base.input to capture input
            this.input.focus();

            this.select(e.target);
            e.preventDefault();
            return false;
        } else if (e.target === this.input) {
            this.select();
        }
    }

    handleInput(e) {
        const { key } = e,
            separator = this.checker.test(key),
            selectedTag = this.tagsNode.querySelector(".selected"),
            lastTag = this.tagsNode.lastElementChild;

        if (key === KEY_ENTER && selectedTag) {
            selectedTag.classList.add("editing");
            selectedTag.focus();
        } else if (key === KEY_ENTER || separator) {
            this.saveInput();
        } else if (key === KEY_DELETE && selectedTag) {
            selectedTag.remove();
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
        if (this.editOnly) {
            return;
        }
        const sel = this.tagsNode.querySelector(".selected");
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
        this.value = this.checker.join(this.tags);
        this.dispatchEvent(new Event("change", { bubbles: true }));
    }

    getElementBefore(tag) {
        for (const element of this.tagsNode.childNodes) {
            if (tag < element.dataset.tag) {
                return element;
            }
        }
        return null;
    }
}

customElements.define("tags-input", TagsInput, { extends: "input" });

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

function escapeRegexpOperators(str) {
    return str.replace(REGEX_OPERATORS, "\\$&");
}

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
    const regex = new RegExp(separators.split("").map(escapeRegexpOperators).join("|"));

    return {
        split: (s) => (!s || !s.trim() ? [] : s.split(regex)),
        join: (arr) => arr.join(separators[0]),
        test: (char) => regex.test(char),
    };
}

function checkerForSeparator(separator) {
    if (!separator) {
        return noSeparator();
    }

    return separator.length > 1 ? multi(separator) : simple(separator);
}

function caretAtStart(el) {
    try {
        return el.selectionStart === 0 && el.selectionEnd === 0;
    } catch {
        return el.value === "";
    }
}
