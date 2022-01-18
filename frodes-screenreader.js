// Browser Screen Reader
// By Frode Eika Sandnes, Oslo Metropolitan University, September, 2021

// the content of the document for easy access in order of presentation
var tags = [];
var tagDescription = [];
var contents = [];  
var language = [];
var elementReferences = [];

// current reading location in the document for the main element types
var currentTag = 0; 
var currentImg = 0;
var currentHeading = 0;
var currentParagraph = 0;
var currentLink = 0;

// arrays with index to contents of given type, including the most relevant element types
var paragraphs = [];
var headings = [];
var images = [];
var links = []; 

// tag to description mappings
var tagMappings = new Map([
    ["H1","Heading"],    
    ["H2","Heading"],    
    ["H3","Heading"],    
    ["H4","Heading"],    
    ["H5","Heading"],    
    ["H6","Heading"],
    ["IMG","Graphic"],    
    ["A","Link"],    
    ["P","Paragraph"]    
]);

// handler for passive state
function passive()
    {
    // do nothing   
    }

// handler for active (speaking) state
function active()
    {
    speakout(tagDescription[currentTag]+", "+contents[currentTag],language[currentTag]);
    if (currentTag >= tags.length-1)
        {
        state = passive;    // We have reached the end of the document - stop.
        }
    else
        {
        currentTag++;       // advance to the next element
        }
    }
// handler for active (speaking paragraph) state
function activeParagraph()
    {
    active();
    var nextTag = tags[currentTag]; // check if next sentence is contination, then tag name is an empty string
    if (nextTag.length > 0)     
      {
      state = passive;        
      }            
    }

// state variable which points to the handler
var state = passive;

// keyobard mappings
var keyboardMappings = new Map([
	["Escape", ()=> {
                    window.speechSynthesis.cancel(); 
                    state = passive;
                    }],                        
    ["s",     () => {
                    speakEntireDoc();
                    }],                
	[" ",     () => {
                    speakEntireDoc(currentTag);
                    }],    
	["g",     () => {
                    var pos = images[currentImg];
                    if (currentImg < images.length) currentImg++;
                    speakElement(pos);
                    }],
	["G",     () => {
                    if (currentImg > 0) currentImg--;
                    speakElement(images[currentImg]);
                    }],
    ["h",     () => {
                    var pos = headings[currentHeading];
                    if (currentHeading < headings.length) currentHeading++;
                    speakElement(pos);
                    }],
	["H",     () => {
                    if (currentHeading > 0) currentHeading--;
                    speakElement(headings[currentHeading]);
                    }], 
    ["p",     () => {
                    var pos = paragraphs[currentParagraph]
                    if (currentParagraph < paragraphs.length) currentParagraph++;
                    speakElement(pos);
                    }],
	["P",     () => {
                    if (currentParagraph > 0) currentParagraph--;
                    speakElement(paragraphs[currentParagraph]);
                    }],   
    ["l",     () => {
                    var pos = links[currentLink];
                    if (currentLink < links.length) currentLink++;
                    speakElement(pos);
                    }],
	["L",     () => {
                    if (currentLink > 0) currentLink--;
                    speakElement(links[currentLink]);
                    }],    
    ["ArrowRight",     () => {                        
                        if (currentTag < tags.length) currentTag++;
                        speakElement(currentTag);
                        }],
    ["ArrowLeft",     () => {
                        if (currentTag-1 > 0) currentTag -= 2;
                        speakElement(currentTag);
                        }],                                                                 
    ["t",     () => { 
                    document.body.innerHTML = controlInfo;                    
                    }],     
    ["T",     () => {  
                    document.body.innerHTML = htmlSource;
                    setupHoverEvents();
                    }]                                             
    ]);

var controlInfo = "<h1>A simple browser-based screen reader</h1>" 
                +"<p>Use the following key-controls to listen to the document or toggle to hover mode and move mouse pointer around to explore the contents.</p>"
                +"<h2>Screenreader controls</h2><ul>"
                +"<li>SPACE - stop/resume playback</li>"
                +"<li>S - read entire document from top</li>"
                +"<li>ESC - stop reading</li>"
                +"<li>G / SHIFT+G - next/previous graphic</li>"
                +"<li>H / SHIFT+H - next/previous heading</li>"
                +"<li>P / SHIFT+P - next/previous paragraph</li>"
                +"<li>ArrowLeft / ArrowRight - previous/next sentence</li>"
                +"<li>T / SHIFT+T - toogle control info, hover mode</li>"
                +"</ul>By Frode Eika Sandnes, Oslo Metropolitan University, September, 2021";

var htmlSource = "";

setup();    // called on startup to set up datastructure. Browser TTS require that the user initiates the speech (trhough (keystroke) event). 

function setup()
    {
    // read all tags and build datastructure
    for (var e of document.querySelectorAll("*")) 
		{
        elementReferences.push(tags.length);
        // special case for images as text is in the attribute
        if (e.tagName.match("IMG"))
            {
            var altText = e.getAttribute("alt");
            if (validAlt(altText))
                {
                images.push(tags.length);
                storeTextContent(e.tagName,
                    altText,
                    tagMappings.has(e.tagName)?tagMappings.get(e.tagName):e.tagName,
                    e.getAttribute("lang"));                                     
                }
            }
        else if (!isTagWithoutText(e))      // all other tags, take the body of the tags.
            {
            if (e.tagName.match("P"))
                {
                paragraphs.push(tags.length);
                }
            if (["H1","H2","H3","H4","H5","H6"].includes(e.tagName))
                {
                headings.push(tags.length);                
                }
            if (e.tagName.match("A"))
                {
                links.push(tags.length);
                }
            storeTextContent(e.tagName,
                             processedTextContent(e),
                             tagMappings.has(e.tagName)?tagMappings.get(e.tagName):e.tagName,
                             e.getAttribute("lang"));                
            }         
        }
    // setup keyboard listener
    window.addEventListener('keydown', function (e) 
            {
            if (keyboardMappings.has(e.key))
                {
                keyboardMappings.get(e.key)();	// call the respective function
                }														
            }
        );
    // remove existing content and how instructions
    document.body.style = "background: black; color: gray";
    htmlSource += JSON.parse(JSON.stringify(document.body.innerHTML)); // deep copy 
    document.body.innerHTML = controlInfo;      
    }

function storeTextContent(name,textContents,description,lang)
    {
    var firstElement = true;
    for (sentence of textContents.split("."))
        {
        if (firstElement)
            {
            tags.push(name);
            tagDescription.push(description);
            firstElement = false;
            }
        else
            {
            tags.push("");
            tagDescription.push("");
            }    
        contents.push(sentence);
        language.push(lang);
        }
    }

// called when switching to hover mode
function setupHoverEvents()
    {    
    for (var e of document.querySelectorAll("*"))
        {         
        e.addEventListener('mouseenter',(event) => 
                {        
                var allElements = Array.from(document.querySelectorAll("*"));                    
                var index = allElements.indexOf(event.target);
                index = elementReferences[index];              
                if (index >= 0)
                    {
                    speakElement(index);
                    }          
                });
        }
    }

// List trhough entire document from startpoint to tend
// first parameter for resuming where we left off
function speakEntireDoc(from = 0)
    {
    state = active;
    currentTag = from;
    state();    
    }
// just speak the current tag
function speakElement(elem = 0)
    {
    currentTag = elem;
    state = activeParagraph;
    state();       
    }

// Utility function for browser: check if a text has text contents (ignore nesting). If it has no text content it should be ignored.
function isTagWithoutText(e)
	{
	if (typeof e.childNodes[0] == 'undefined')
		{
		return true;		// has no children - empty - it is withoutChild!
		}	
	// get the text
	var divText = processedTextContent(e); 	
	if (divText == "")
		{
		return true;	// text is empty - it is withoutChild!
		}						
	return false; // it much have text
	}

// traverses the children to extract the text content of the element. Remove unnecessary blank space.
function processedTextContent(e) 
	{
	var str = "";
	for (var child of e.childNodes)
		{
		if (child.nodeValue != null)
			{
			str += child.nodeValue;
			}
		}
	// clear away spaces
	str = str.replace(/\n/g,"").replace(/\t/g,"").trim();
	return str;
	}    
        
// simple check that the alt text is available and "human readable"
function validAlt(alt)
	{
	if (typeof alt == "undefined")
		{
		return false;	
		}
	if (alt == null)
		{
		return false;
		}
	if (alt.length > 0)		// more than one character
		{
		return true;	
		}
	// add more elaborate checks later
	return false;
	}	
    
// use the browser speech syntesizer on text snippet with given language
function speakout(str,lang)
    {
    window.speechSynthesis.cancel();
    let speech = new SpeechSynthesisUtterance();
    if (lang != null)
        {
        speech.lang = lang;
        }
    speech.text = str;
    speech.onend = () => {state();}
    speaking = true;
    window.speechSynthesis.speak(speech);   
    }
