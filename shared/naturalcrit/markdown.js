const Markdown = require('marked');
const renderer = new Markdown.Renderer();

// Processes the markdown within an HTML block if it's just a class-wrapper
renderer.html = function(html) {
    const trimmed = html.trim();
    if (trimmed.startsWith('<div') && trimmed.endsWith('</div>')) {
        const openTag = html.substring(0, html.indexOf('>') + 1);
        html = html.substring(html.indexOf('>') + 1);
        html = html.substring(0, html.lastIndexOf('</div>'));
        return `${openTag} ${Markdown(html)} </div>`;
    }
    return html;
};

// Ensure {{ Divs don't confuse paragraph parsing (else it renders empty paragraphs)
renderer.paragraph = function(text) {
    return (text.startsWith('<div') || text.startsWith('</div')) ?
        `${text}` : `<p>${text}</p>\n`;
};

// Mustache-style Divs {{class \n content ... \n}}
let blockCount = 0;
const blockRegex = /^ *{{(?:="[\w, ]*"|[^"'\s])*$|^ *}}$/gm;
const inlineFullRegex = /{{[^\n]*}}/g;
const inlineRegex = /{{(?:="[\w, ]*"|[^"'\s])*\s*|}}/g;

renderer.text = function(text) {
    const newText = text.replaceAll('&quot;', '"');
    let matches;

    // DIV - BLOCK-LEVEL
    if (matches = newText.match(blockRegex)) {
        let matchIndex = 0;
        const res =  newText.split(blockRegex).reduce((r, splitText) => {
            if (splitText) r.push(Markdown.parseInline(splitText, { renderer: renderer }));

            const block = matches[matchIndex] ? matches[matchIndex].trimLeft() : '';
            if (block && block.startsWith('{')) {
                const values = processStyleTags(block.substring(2));
                r.push(`<div class="block ${values}">`);
                blockCount++;
            } else if (block === '}}' && blockCount !== 0) {
                r.push('</div>');
                blockCount--;
            }

            matchIndex++;

            return r;
        }, []).join('');
        return res;
    } else if (matches = newText.match(inlineFullRegex)) {
        // SPAN - INLINE
        matches = newText.match(inlineRegex);
        let matchIndex = 0;
        const res = newText.split(inlineRegex).reduce((r, splitText) => {
            if (splitText)
                r.push(Markdown.parseInline(splitText, { renderer: renderer }));

            const block = matches[matchIndex] ? matches[matchIndex].trimLeft() : '';
            if (block && block.startsWith('{{')) {
                const values = processStyleTags(block.substring(2));
                r.push(`<span class="inline-block ${values}>`);
                blockCount++;
            } else if (block === '}}' && blockCount !== 0) {
                r.push('</span>');
                blockCount--;
            }

            matchIndex++;

            return r;
        }, []).join('');
        return `${res}`;
    } else {
        if (!matches) {
            return `${text}`;
        }
    }
};

// Fix local links in the Preview iFrame to link inside the frame
renderer.link = function (href, title, text) {
    let self = false;
    if (href[0] === '#') {
        self = true;
    }
    href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);

    if (href === null) {
        return text;
    }
    let out = `<a href="${escape(href)}"`;
    if (title) {
        out += ` title="${title}"`;
    }
    if (self) {
        out += ' target="_self"';
    }
    out += `>${text}</a>`;
    return out;
};

const nonWordAndColonTest = /[^\w:]/g;
const cleanUrl = function (sanitize, _base, href) {
    if (sanitize) {
        let prot;
        try {
            prot = decodeURIComponent(unescape(href))
                .replace(nonWordAndColonTest, '')
                .toLowerCase();
        } catch (_e) {
            return null;
        }
        if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
            return null;
        }
    }
    try {
        href = encodeURI(href).replace(/%25/g, '%');
    } catch (_e) {
        return null;
    }
    return href;
};

const escapeTest = /[&<>"']/;
const escapeReplace = /[&<>"']/g;
const escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
const escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
const escapeReplacements = {
    '&'  : '&amp;',
    '<'  : '&lt;',
    '>'  : '&gt;',
    '"'  : '&quot;',
    '\'' : '&#39;'
};
const getEscapeReplacement = ch => escapeReplacements[ch];
const escape = function (html, encode) {
    if (encode) {
        if (escapeTest.test(html)) {
            return html.replace(escapeReplace, getEscapeReplacement);
        }
    } else {
        if (escapeTestNoEncode.test(html)) {
            return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
        }
    }
    return html;
};

const sanatizeScriptTags = content =>
    content
        .replace(/<script/ig, '&lt;script')
        .replace(/<\/script>/ig, '&lt;/script&gt;');


function lodash_remove(array, predicate) {
    var result = [];
    if (!(array && array.length)) {
        return result;
    }
    var index = -1,
        indexes = [],
        length = array.length;

    predicate = getIteratee(predicate, 3);
    while (++index < length) {
        var value = array[index];
        if (predicate(value, index, array)) {
            result.push(value);
            indexes.push(index);
        }
    }
    basePullAt(array, indexes);
    return result;
}

const processStyleTags = string => {
    const tags = string.match(/(?:[^, "=]+|="[^"]*")+/g);

    if (!tags) return '"';

    const id      = lodash_remove(tags, tag => tag.startsWith('#')).map(tag => tag.slice(1))[0];
    const classes = lodash_remove(tags, tag => !tag.includes('"'));
    const styles  = tags.map((tag)=>tag.replace(/="(.*)"/g, ':$1;'));
    return `${classes.join(' ')}" ${id ? `id="${id}"` : ''} ${styles ? `style="${styles.join(' ')}"` : ''}`;
};

module.exports = {
    marked: Markdown,
    render: rawBrewText => {
        blockCount = 0;
        rawBrewText = rawBrewText.replace(/^\\column/gm, `<div class='columnSplit'></div>`)
                                 .replace(/^}}/gm, '\n}}')
                                 .replace(/^({{[^\n]*)$/gm, '$1\n');
        return Markdown(
            sanatizeScriptTags(rawBrewText),
            { renderer: renderer }
        );
    }
};
