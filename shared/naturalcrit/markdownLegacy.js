const Markdown = require('markedLegacy');
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
    // if (trimmed.startsWith('<style') && trimmed.endsWith('</style>')) {
    // 	const openTag = html.substring(0, html.indexOf('>')+1);
    // 	html = html.substring(html.indexOf('>')+1);
    // 	html = html.substring(0, html.lastIndexOf('</style>'));
    // 	html = html.replaceAll(/\s(\.[^{]*)/gm, '.legacy $1');
    // 	return `${openTag} ${html} </style>`;
    // }
    return html;
};

renderer.link = function(href, title, text) {
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
const cleanUrl = function(sanitize, _base, href) {
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
const escape = function(html, encode) {
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

module.exports = {
    marked: Markdown,
    render: rawBrewText => {
        return Markdown(
            sanatizeScriptTags(rawBrewText),
            { renderer: renderer }
        );
    }
};
