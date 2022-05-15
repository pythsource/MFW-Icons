// <nowiki>
mw.loader.using( 'jquery.client', function () {

var clientProfile = $.client.profile();
var hotkey = clientProfile.platform === 'mac' ? 'Ctrl+Shift+W' : 'Ctrl+Alt+W';
var strings = {
	name: 'Викификатор',
	tooltip: 'Викификатор — автоматический обработчик текста (' + hotkey + ')',
	summary: 'викификатор',
	fullText: 'Викификатор обработает ВЕСЬ текст на этой странице. Продолжить?',
	talkPage: 'Викификатор не обрабатывает страницы обсуждения целиком.\n\nВыделите ваше сообщение — обработано будет только оно.'
};
window.wfPlugins = window.wfPlugins || [];
window.wfPluginsT = window.wfPluginsT || [];

// Function takes an input or text as an argument. If it is absent, it uses $( '#wpTextbox1' )
// as an input.
window.Wikify = function ( inputOrText ) {
	'use strict';

	// FUNCTIONS

	function r( r1, r2 ) {
		txt = txt.replace( r1, r2 );
	}

	function hide( re ) {
		r( re, function ( s ) {
			return '\x01' + hidden.push( s ) + '\x02';
		} );
	}

	function hideTag ( tag ) {
		hide( new RegExp( '<' + tag + '( [^>]+)?>[\\s\\S]+?<\\/' + tag + '>', 'gi' ) );
	}

	function hideTemplates() {
		hide( /\{\{([^{]\{?)+?\}\}/g );
		var pos = 0,
			stack = [],
			tpl,
			left,
			right;
		while ( true ) {
			left = txt.indexOf( '{{', pos );
			right = txt.indexOf( '}}', pos );
			if ( left === -1 && right === -1 && !stack.length ) {
				break;
			}
			if ( left !== -1 && ( left < right || right === -1 ) ) {
				stack.push( left );
				pos = left + 2;
			} else {
				left = stack.pop();
				if ( typeof left === 'undefined' ) {
					if ( right === -1 ) {
						pos += 2;
						continue;
					} else {
						left = 0;
					}
				}
				if ( right === -1 ) {
					right = txt.length;
				}
				right += 2;
				tpl = txt.substring( left, right );
				txt = txt.substring( 0, left ) +
					'\x01' + hidden.push( tpl ) + '\x02' +
					txt.substr( right );
				pos = right - tpl.length;
			}
		}
	}
	
	function processLink( link, left, right ) {
		left = left.replace( /[ _\u00A0]+/g, ' ' ).trim();
		if ( left.match( /^(?:Категория|Файл) ?:/ ) ) {
			return '[[' + left + '|' + right + ']]';
		}
		right = right.replace( / {2,}/g, ' ' ).trim();
		var inLink = right.substr( 0, left.length );
		var afterLink = right.substr( left.length );
		var uniLeft = left.substr( 0, 1 ).toUpperCase() + left.substr( 1 );
		var uniRight = ( right.substr( 0, 1 ).toUpperCase() + right.substr( 1 ) )
			.replace( /[_\u00A0]/g, ' ' );
		if ( uniRight.indexOf( uniLeft ) === 0 && afterLink.match( /^[a-zа-яё]*$/ ) ) {
			return '[[' + inLink + ']]' + afterLink;
		} else {
			return '[[' + left + '|' + right + ']]';
		}
	}

	function processText() {
		var u = '\u00A0'; // non-breaking space
		if (
			// is talk page
			mw.config.get( 'wgNamespaceNumber' ) % 2 ||
			mw.config.get( 'wgNamespaceNumber' ) === 4
		) {
			var sigs = txt.match( /\d\d:\d\d, \d\d? \S{3,8} 20\d\d \(UTC\)/g );
			if ( sigs && sigs.length > 1 ) {
				alert( strings.talkPage );
				return;
			}
		}

		hideTag( 'nowiki' );
		hideTag( 'pre' );
		hideTag( 'source' );
		hideTag( 'syntaxhighlight' );
		hideTag( 'templatedata' );

		hideTag( 'code' );
		hideTag( 'kbd' );
		hideTag( 'tt' );

		hideTag( 'graph' );
		hideTag( 'hiero' );
		hideTag( 'math' );
		hideTag( 'timeline' );
		hideTag( 'chem' );
		hideTag( 'score' );
		hideTag( 'categorytree' );
		hideTag( 'imagemap' );
		hideTag( 'inputbox' );
		hideTag( 'mapframe' );
		hideTag( 'maplink' );

		r( /(^|[А-Яа-я])\u00eb([а-я]|$)/g, '$1ё$2' ); // wrong cyr/lat "ё"
		r( /(^|[А-Яа-я])\u00cb([а-я]|$)/g, '$1Ё$2' ); // wrong cyr/lat "Ё"
		r( /\{\{(?:подст|subst):(?:[уУ]дар(?:ение)?|')\}\}/g, '\u0301' );
		r( /( |\n|\r)+\{\{(·|•|\*)\}\}/g, '{{$2}}' ); // before {{·/•/*}}, usually in templates
		r( /\{\{\s*[Шш]аблон:([\s\S]+?)\}\}/g, '{{$1}}' );
		r( /(\{\{\s*)(?:reflist|список примечаний)(\s*[\|\}])/ig, '$1примечания$2' );
		r( /(\{\{\s*)примечания(\s*\|\s*)[4-9](\s*[\|\}])/ig, '$1примечания$2узкие$3' );
		r( /(\{\{\s*)примечания\s*\|\s*height=[0-9]*(\s*[\|\}])/ig, '$1примечания$2' );
		r( /[\u00A0 ]+(\{\{\s*([Rr]ef-[a-z\-]+?|[Ee]n icon|[Cc]hecked|[Vv]|[Пп]роверено)\}\})/g, '$1' );
		r( /<[\/\\]?(hr|br)( [^\/\\>]+?)?? *[\/\\]?>/gi, '<$1$2>' );
		r(
			/(\| *Координаты[ _А-ЯЁа-яё]*= *)(\d+(?:[.,]\d+)?)[,/] ?(\d+(?:[.,]\d+)?(?=\s))/g,
			function ( s, m1, m2, m3 ) {
				return (
					m1 +
					( +parseFloat( m2.replace( ',', '.' ) ).toFixed( 4 )) +
					'/' +
					( +parseFloat( m3.replace( ',', '.' ) ).toFixed( 4 ) )
				);
			}
		);
		r( /<noinclude>\s*(\{\{[dD]ocpage\}\})\s*<\/noinclude>/g, '$1' );
		r( /(\| *(?:pp?|S|s|с|c|страницы\d?|pages\d?|seite\d?|alleseiten|листы\d?|том|volume|band|выпуск|issue|heft|номер|столбцы\d?|columns\d?|kolonnen\d?|серия год) *= *)(\d+)[\u00A0 ]?(?:-{1,3}|—) ?(\d+)/g, '$1$2—$3' );
		r( /(\| *год *= *)(\d{4})[\u00A0 ]?(?:-{1,3}|—) ?(\d{4})/g, '$1$2—$3' );

		r( /(\[\[[^\{\]|\n]+){{!}}([^\{\]|\n]+\]\])/g, '$1|$2' );
		
		if ( txt.indexOf( '{{НП' ) > -1 ) {
			r( / *\| *(?:CoordAddon|ЯндексКарта)[^\|\}]+\n/g, '' );
			r( / *\| *размер карты (?:страны|региона|района) *= *[^\|\}]+\n/g, '' );
		}
		
		var i;
		for ( i in window.wfPluginsT ) {
			if ( window.wfPluginsT.hasOwnProperty( i ) ) {
				window.wfPluginsT[i]( txt, r );
			}
		}

		hideTemplates();
		hide( /^[ \t].*/mg );
		hide( /((?:https?|ftp|news|nntp|telnet|irc|gopher):\/\/|mailto:)[^\s\[\]<>"]+ ?/gi );
		hide( /^#(redirect|перенапр(авление)?)/i );
		hideTag( 'gallery' );


		r( / +(\n|\r)/g, '$1' ); // spaces at EOL
		txt = '\n' + txt + '\n';


		// LINKS
		r( /(\[\[:?)(?:category|категория):( *)/ig, '$1Категория:' );
		r( /(\[\[:?)(?:module|модуль):( *)/ig, '$1Модуль:' );
		r( /(\[\[:?)(?:template|шаблон):( *)/ig, '$1Шаблон:' );
		r( /(\[\[:?)(?:image|изображение|file|файл):( *)/ig, '$1Файл:' );
		// Linked years, centuries and ranges
		r( /(\(|\s)(\[\[[12]?\d{3}\]\])[\u00A0 ]?(-{1,3}|–|—) ?(\[\[[12]?\d{3}\]\])(\W)/g, '$1$2—$4$5' );
		r( /(\[\[[12]?\d{3}\]\]) ?(гг?\.)/g, '$1' + u + '$2' );
		r( /(\(|\s)(\[\[[IVX]{1,5}\]\])[\u00A0 ]?(-{1,3}|–|—) ?(\[\[[IVX]{1,5}\]\])(\W)/g, '$1$2—$4$5' );
		r( /(\[\[[IVX]{1,5}\]\]) ?(вв?\.)/g, '$1' + u + '$2' );
		r( /\[\[(\d+)\]\]\sгод/g, '[[$1' + u + 'год]]' );
		r( /\[\[(\d+)\sгод\|\1\]\]\sгод/g, '[[$1' + u + 'год]]' );
		r( /\[\[(\d+)\sгод\|\1\sгод([а-я]{0,3})\]\]/g, '[[$1' + u + 'год]]$2' );
		r( /\[\[((\d+)(?: (?:год )?в [\wa-яёА-ЯЁ ]+\|\2)?)\]\][\u00A0 ](год[а-яё]*)/g, '[[$1' + u + '$3]]' );
		r( /\[\[([XVI]+)\]\]\sвек/g, '[[$1' + u + 'век]]' );
		r( /\[\[([XVI]+)\sвек\|\1\]\]\sвек/g, '[[$1' + u + 'век]]' );
		r( /\[\[([XVI]+)\sвек\|\1\sвек([а-я]{0,3})\]\]/g, '[[$1' + u + 'век]]$2' );
		r( /\[\[(([XVI]+) век\|\2)\]\][\u00A0 ]век/g, '[[$2' + u + 'век]]' );
		// Nice links
		r( /(\[\[[^|[\]]*)[\u00AD\u200E\u200F]+([^\[\]]*\]\])/g, '$1$2' ); // Soft Hyphen & DirMark
		r( /\[\[ *([^|[\]]+?) *\| *('''''|'''|'')([^'|[\]]*)\2 *]]/g, '$2[[$1|$3]]$2' ); // move fomatting out of link text
		r( /\[\[ *([^|[\]]+?) *\| *«([^»|[\]]*)» *\]\]/g, '«[[$1|$2]]»' ); // move quotation marks out of link text
		r( /\[\[ *([^|[\]]+?) *\| *„([^“|[\]]*)“ *\]\]/g, '„[[$1|$2]]“' );
		r( /\[\[ *([^|[\]]+?) *\| *"([^"|[\]]*)" *\]\]/g, '"[[$1|$2]]"' );
		r( /\[\[([^|[\]\n]+)\|([^|[\]\n]+)\]\]/g, processLink ); // link shortening
		r( /\[\[ *([^|[\]]+)([^|\[\]()]+?) *\| *\1 *\]\]\2/g, '[[$1$2]]' ); // text repetition after link
		r( /\[\[ *(?!Файл:|Категория:)([a-zA-Zа-яёА-ЯЁ\u00A0-\u00FF %!\"$&'()*,\-—.\/0-9:;=?\\@\^_`’~]+) *\| *([^\|\[\]]+) *\]\]([a-zа-яё]+)/g, '[[$1|$2$3]]' ); // "
		hide( /\[\[[^\]|]+/g); // only link part


		// TAGS
		r( /<<(\S.+\S)>>/g, '"$1"' ); // << >>
		r( /(su[pb]>)-(\d)/g, '$1−$2' ); // ->minus
		r( /<(b|strong)>(.*?)<\/(b|strong)>/gi, "'''$2'''" );
		r( /<(i|em)>(.*?)<\/(i|em)>/gi, "''$2''" );
		r( /^<hr ?\/?>/gim, '----' );
		r( /[\u00A0 \t]*<ref(?:\s+name="")?(\s|>)/gi, '<ref$1' );
		r( /(\n== *[a-zа-я\s\.:]+ *==\n+)<references(?: +responsive *= *"")? *\/>/ig, '$1{' + '{примечания}}' );
		hide( /<[a-z][^>]*?>/gi);

		hide( /^(\{\||\|\-).*/mg); // table/row def
		hide( /(^\||^!|!!|\|\|) *[a-z]+=[^|]+\|(?!\|)/mgi); // cell style
		hide( /\| +/g); // formatted cell

		r( /[ \t\u00A0]{2,}/g, ' ' ); // double spaces

		// Entities etc. → Unicode chars
		if ( mw.config.get( 'wgNamespaceNumber' ) !== 10 ) {
			r( /&(#x[0-9a-f]{2,4}|#[0-9]{3,4}|[0-9a-z]{2,8});/gi, function ( s ) {
				var t = document.createElement( 'textarea' );
				t.innerHTML = s;
				var c = t.value;
				if ( c.length === 1 && c.charCodeAt( 0 ) > 127 || s === '&#x20;' ) {
					return c;
				}
				return s;
			});
		}
		r( /\(tm\)/gi, '™' );
		r( /\.\.\./g, '…' );
		r( /(^|[^+])\+-(?!\+|-)/g, '$1±' );
		r( /~=/g, '≈' );
		r( /\^2(\D)/g, '²$1' );
		r( /\^3(\D)/g, '³$1' );
		r( /\sкв\.\s*([дсмнк]?м|мкм)([\s\.,;:)])/g, u + '$1²$2' );
		r( /\sкуб\.\s*([дсмнк]?м|мкм)([\s\.,;:)])/g, u + '$1³$2' );
		r( /((?:^|[\s"])\d+(?:[\.,]\d+)?\s*)[xх](\s*\d+(?:[\.,]\d+)?)\s*([мm]{1,2}(?:[\s"\.,;?!]|$))/g, '$1×$2' + u + '$3' );
		r( /\s+×\s+/g, u + '×' + u );
		r( /([\wа-яА-ЯёЁ])'(?=[\wа-яА-ЯёЁ])/g, '$1’' ); // '
		r( /№№/g, '№' );

		// Headings
		r( /^(=+)[ \t\f\v]*(.*?)[ \t\f\v]*=+$/gm, '$1 $2 $1' ); // add spaces inside
		r( /([^\r\n])(\r?\n==.+==\r?\n)/g, '$1\n$2' ); // add empty line before
		r( /(==.+==)[\r\n]{2,}(?!=)/g, '$1\n' ); // remove empty line after
		r( /^== (см(\.?|отр(и|ите|еть))|see) ?(также|ещ[её]|also|more) ==$/gmi, '== См. также ==' );
		r( /^== сноски ==$/gmi, '== Примечания ==' );
		r( /^== внешние\sссылки ==$/gmi, '== Ссылки ==' );
		r( /^== (?:(.+[^.])\.|(.+):) ==$/gm, '== $1$2 ==' );
		r( /^== '''(?!.*'''.*''')(.+)''' ==$/gm, '== $1 ==' );

		r( /«|»|“|”|„/g, '"' ); // temp

		// Hyphens and en dashes to pretty dashes
		r( /–/g, '-' ); // &ndash; -> hyphen
		r( /(\s)-{1,3} /g, '$1— ' ); // hyphen -> &mdash;
		r( /(\d)--(\d)/g, '$1—$2' ); // -> &mdash;
		r( /(\s)-(\d)/g, '$1−$2' ); // hyphen -> minus

		r(
			/(Boeing|Боинг(?:а|у|ом|е|и|ов|ам|ах))?(\(|\s)([12]?\d{3})[\u00A0 ]?(?:-{1,3}|—) ?([12]?\d{3})(?![\wА-ЯЁа-яё]|-[^ех]|-[ех][\wА-ЯЁа-яё])/g,
			function ( s, m1, m2, m3, m4 ) {
				// filter Boeing airplanes; see the list at https://pastebin.com/rgJv6R4z (no new items expected)
				if (
					( m3[ 0 ] === '7' && m3[ 2 ] === '7' ) &&
					(
						m1 ||
						m4 < m3 && ( m4[ 2 ] === '0' || m4 === '138' || m4 === '227' ) ||
						m3 === '707' && m4 === '820' ||
						m3 === '737' && m4 === '800' ||
						m3 === '737' && m4 === '900'
					)
				) {
					return s;
				}
				return ( m1 || '' ) + m2 + m3 + '—' + m4;
			}
		);

		// Year and century ranges
		r( /([12]?\d{3}) ?(гг?\.)/g, '$1' + u + '$2' );
		r( /(\(|\s)([IVX]{1,5})[\u00A0 ]?(-{1,3}|—) ?([IVX]{1,5})(?![\w\-])/g, '$1$2—$4' );
		r( /([IVX]{1,5}) ?(вв?\.)/g, '$1' + u + '$2' );

		// Reductions
		r( /(Т|т)\.\s?е\./g, '$1о есть' );
		r( /(Т|т)\.\s?к\./g, '$1ак как' );
		r( /(В|в)\sт\. ?ч\./g, '$1 том числе' );
		r( /(И|и)\sт\.\s?д\./g, '$1' + u + 'т.' + u + 'д.' );
		r( /(И|и)\sт\.\s?п\./g, '$1' + u + 'т.' + u + 'п.' );
		r( /(Т|т)\.\s?н\./g, '$1.' + u + 'н.' );
		r( /(И|и)\.\s?о\./g, '$1.' + u + 'о.' );
		r( /с\.\s?ш\./g, 'с.' + u + 'ш.' );
		r( /ю\.\s?ш\./g, 'ю.' + u + 'ш.' );
		r( /в\.\s?д\./g, 'в.' + u + 'д.' );
		r( /з\.\s?д\./g, 'з.' + u + 'д.' );
		r( /л\.\s?с\./g, 'л.' + u + 'с.' );
		r( /а\.\s?е\.\s?м\./g, 'а.' + u + 'е.' + u + 'м.' );
		r( /а\.\s?е\./g, 'а.' + u + 'е.' );
		r( /мм\sрт\.\s?ст\./g, 'мм' + u + 'рт.' + u + 'ст.' );
		r( /н\.\s?э(\.|(?=\s))/g, 'н.' + u + 'э.' );
		r( /(Д|д)(о|\.)\sн\.\s?э\./g, '$1о' + u + 'н.' + u + 'э.' );
		r( /(\d)[\u00A0 ]?(млн|млрд|трлн|(?:м|с|д|к)?м|[км]г)\.?(?=[,;.]| "?[а-яё\-]{2,}|\s*\|)/g, '$1' + u + '$2' );
		r( /(\d)[\u00A0 ](тыс)([^\.А-Яа-яЁё])/g, '$1' + u + '$2.$3' );
		r( /ISBN:\s?(?=[\d\-]{8,17})/, 'ISBN ' );

		// Insert/delete spaces
		r( /^([#*:]+)[\u00A0 \t\f\v]*(?!\{\|)([^\u00A0 \t\f\v*#:;])/gm, '$1 $2' ); // space after #*: unless before table
		r( /(\S)[\u00A0 \t](-{1,3}|—)[\u00A0 \t](\S)/g, '$1' + u + '— $3' );
		r( /(^|[^\wА-яЁё\.])([А-ЯЁ][а-яё]+) ([А-ЯЁ]\.) ?([А-ЯЁ]\.)(?! ?[А-ЯЁ][а-яё\.])/g,'$1$2' + u + '$3' + u + '$4' ); // инициалы "Петров А. В."
		r( /(^|[^\wА-яЁё\.])([А-ЯЁ]\.) ?([А-ЯЁ]\.) ?(?=[А-ЯЁ][а-яё]+)/g, '$1$2' + u + '$3' + u); // инициалы "А. В. Петров"
		r( /([а-яё]"?\)?[\.\?!:])((?:\x01\d+\x02\|)?(?:[A-QS-ZА-ЯЁ]|R(?!u\b)))/g, '$1 $2' ); // "word. Word"; don't change in cases like "Газета.Ru"
		r( /([)"a-zа-яё\]²³])\s*([,:])([\[(a-zа-яё])/g, '$1$2 $3' ); // "word, word", "word: word"; except ":"
		r( /([)a-zа-яё\]²³])\s*([,:])"/g, '$1$2 "' );
		r( /([)"a-zа-яё\]²³])[ \u00A0\t]([,;])\s([\[("a-zа-яё])/g, '$1$2 $3' );
		r( /([^%\/\wА-Яа-яЁё"]\d+?(?:[\.,]\d+?)?) ?([%‰])(?!-[А-Яа-яЁё])/g, '$1' + u + '$2' ); //5 %
		r( /(\d) ([%‰])(?=-[А-Яа-яЁё])/g, '$1$2' ); //5%-й
		r( /([№§])(\s*)(\d)/g, '$1' + u + '$3' );
		// inside ()
		r( /\( +/g, '(' );
		r( / +\)/g, ')' );

		// Temperature
		r( /([\s\d=≈≠≤≥<>—("'|])([+±−\-]?\d+?(?:[.,]\d+?)?)(([ °\^*]| [°\^*])(C|F))(?=[\s"').,;!?|\x01])/gm, '$1$2' + u + '°$5' ); // '

		r( /(\s\d+)\.(\d+[\u00A0 ]*[%‰°×])/gi, '$1,$2' ); // dot → comma in numbers
		r( /(\d) (?=\d{3}\b)/g, '$1' + u ); // 1 000 000

		// Plugins
		for ( i in window.wfPlugins ) {
			if ( window.wfPlugins.hasOwnProperty( i ) ) {
				window.wfPlugins[i]( txt, r );
			}
		}

		// "" → «»
		for ( i = 1; i <= 2; i++ ) {
			r( /([\s\x02!|#'"\/([{;+\-])"([^"]*)([^\s"([{|])"([^a-zа-яё])/ig, '$1«$2$3»$4' ); // "
		}
		while ( /«[^»]*«/.test( txt ) ) {
			r( /«([^»]*)«([^»]*)»/g, '«$1„$2“' );
		}

		function unhide( s, num ) {
			return hidden[ num - 1 ];
		}
		while ( txt.match( /\x01\d+\x02/ ) ) {
			r( /\x01(\d+)\x02/g, unhide );
		}

		txt = txt.substr( 1, txt.length - 2 ); // compensation for "txt = '\n' + txt + '\n';"
	}

	function processAllText() {
		txt = $input ? $input.textSelection( 'getContents' ) : text;
		processText();
		if ( $input ) {
			r( /^[\n\r]+/, '' );
			
			$input.textSelection( 'setContents', txt );
			if ( caretPosition ) {
				$input.textSelection( 'setSelection', {
					start: caretPosition[0] > txt.length ? txt.length : caretPosition[0]
				} );
			}
		} else {
			text = txt;
		}
		if (
			window.auto_comment &&
			window.insertSummary &&
			!document.editform.wpSection.value
		) {
			window.insertSummary( strings.summary );
		}
	}

	// MAIN CODE
	
	// Check what's in the first parameter
	var text;
	var isInput;
	var $input;
	if ( typeof inputOrText === 'string' ) {
		text = inputOrText;
	} else {
		isInput = (
			inputOrText &&
			(
				( inputOrText.nodeType && inputOrText.value !== undefined ) || // node
				( inputOrText.prop && inputOrText.prop( 'nodeType' ) ) // jQuery object
			)
		);
		$input = $( isInput ? inputOrText : '#wpTextbox1' );
	}

	var txt = '';
	var hidden = [];
	var winScroll = document.documentElement.scrollTop;
	var caretPosition;
	if ( $input ) {
		$input.focus();
		
		caretPosition = $input.textSelection( 'getCaretPosition', { startAndEnd: true } );
		if ( caretPosition ) {
			var $CodeMirrorVscrollbar = $( '.CodeMirror-vscrollbar' );
			var textScroll = ( $CodeMirrorVscrollbar.length ? $CodeMirrorVscrollbar : $input )
				.scrollTop();
			if ( caretPosition[0] === caretPosition[1] ) {
				processAllText();
			} else {
				txt = $input.textSelection( 'getSelection' );
				processText();
				// replaceSelection doesn't work with MediaWiki 1.30 in case this gadget is loaded
				// from other wiki
				$input.textSelection( 'encapsulateSelection', {
					replace: true,
					peri: txt
				} );
				// In CodeMirror, the selection isn't preserved, so we do it explicitly
				$input.textSelection( 'setSelection', {
					start: caretPosition[0],
					end: caretPosition[0] + txt.length
				} );
			}
			( $CodeMirrorVscrollbar.length ? $CodeMirrorVscrollbar : $input )
				.scrollTop( textScroll );
		// If something went wrong
		} else if ( confirm( strings.fullText ) ) {
			processAllText();
		}
	} else {
		processAllText();
		return text;
	}

	// scroll back, for 2017 wikitext editor, IE, Opera
	document.documentElement.scrollTop = winScroll;
};

function registerWikificatorTool() {
	registerTool( {
		name: 'wikificator',
		position: 100,
		title: strings.name,
		label: strings.tooltip,
		callback: Wikify,
		classic: {
			icon: '//raw.githubusercontent.com/pythsource/MFW-Icons/master/Wikify-toolbutton.png',
		},
		visual: {
			icon: '//raw.githubusercontent.com/pythsource/MFW-Icons/master/Wikify-toolbutton.png',
			modes: [ 'source' ],
			addRightAway: true,
		},
	} );
}

if ( mw.config.get( 'wgServerName' ) === 'ru.wikipedia.org' ) {
	registerWikificatorTool();
} else {
	$.when(
		mw.loader.using( [ 'mediawiki.util', 'user.options' ] ),
		$.getScript( 'https://ru.wikipedia.org/w/index.php?title=MediaWiki:Gadget-registerTool.js&action=raw&ctype=text/javascript' )
	).done( registerWikificatorTool );
}

$( '#editform' ).on( 'keydown', function ( e ) {
	// Ctrl+Alt+W on Windows, Ctrl+Shift+W on Mac
	if (
		e.ctrlKey &&
		!e.metaKey &&
		(clientProfile.platform === 'mac' ? e.shiftKey && !e.altKey : !e.shiftKey && e.altKey) &&
		e.keyCode === 87
	) {
		Wikify();
	}
} );

}() );
// </nowiki>