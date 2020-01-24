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

const sanatizeScriptTags = content => {
	return content
		.replace(/<script/ig, '&lt;script')
		.replace(/<\/script>/ig, '&lt;/script&gt;');
};


module.exports = {
	marked: Markdown,
	render: rawBrewText => {
		return Markdown(
			sanatizeScriptTags(rawBrewText),
			{ renderer: renderer }
		);
	}
};
