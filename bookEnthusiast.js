const puppeteer = require('puppeteer');
const fs = require("fs");
const cheerio = require("cheerio");
const request = require("request");

(async function(){
    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["-start-maximized"],
        executablePath: 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'

    });
    let allPages = await browser.pages();
    let tab = allPages[0];
    await tab.goto('https://www.amazon.in');
    await tab.waitForSelector('#nav-hamburger-menu', {visible: true})
    await tab.click('#nav-hamburger-menu')
    await tab.waitForSelector('.nav-sprite.hmenu-arrow-next');
    
    let arrowButtons = await tab.$$('.nav-sprite.hmenu-arrow-next')
    let ebookArrowButton = arrowButtons[2]
    await tab.waitForTimeout(3000)
    await ebookArrowButton.click();
    let nextArrowButtons = await tab.$$('.hmenu.hmenu-visible.hmenu-translateX li');
    let allKindleBooksButton = nextArrowButtons[11];
    await tab.waitForTimeout(3000);
    await allKindleBooksButton.click();
    await tab.waitForSelector('#s-refinements .a-section.a-spacing-none ul', {visible: true});
    
    
    
    
    
    if(!fs.existsSync('./AMAZON')){
        await fs.mkdirSync('./AMAZON');
    }
    await tab.waitForTimeout(10000);
    await tab.waitForSelector('[type="checkbox"]');
    let langTags = await tab.$$('[type="checkbox"]');
    
    for(let i = 0; i<6; i++){
        let langText = await tab.evaluate(function(elem){
            return elem.innerText;
        }, langTags[i]);

        await langWise(browser, tab, langTags[i], langText);
    }
    
    
    tab.close();
    console.log("All of the books are stored in AMAZON folder...")
    browser.close();
    
})();

async function langWise(browser, tab, langTag, langText){
    
    await tab.evaluate(function(elem){
        return elem.click();
    }, langTag);

    
    let langFolderPath = `./AMAZON/${langText}`;
    
    if(!fs.existsSync(langFolderPath)){
        await fs.mkdirSync(langFolderPath);
    }

    await tab.waitForSelector('#departments ul .a-spacing-micro.s-navigation-indent-2 a') ; 
    let genre = await tab.$$('#departments ul .a-spacing-micro.s-navigation-indent-2 a');
    for(let i = 0; i<5; i++){
        let genreLink =  await tab.evaluate(function(elem){
            return elem.getAttribute('href');
        }, genre[i]);
        let genreText = await tab.evaluate(function(elem){
            return elem.text
        }, genre[i]);
        genreText = genreText.trim()
        completeGenreLink = "https://www.amazon.in" + genreLink
        await directingToGenre(completeGenreLink, browser, genreText, langFolderPath);
    }

    await tab.evaluate(function(elem){
        return elem.click();
    }, langTag);

}


async function directingToGenre(completeGenreLink, browser, genreText, langFolderPath){
    
    
    let newTab = await browser.newPage();
    await newTab.goto(completeGenreLink);
    let genrePath = langFolderPath + `${genreText}`;
    if(!fs.existsSync(genrePath)){
        fs.mkdirSync(genrePath);
    }
    await newTab.waitForSelector('.a-size-mini.a-spacing-none.a-color-base.s-line-clamp-2 a');
    
    let booksATags = await newTab.$$('.a-size-mini.a-spacing-none.a-color-base.s-line-clamp-2 a');
    let booksLinks = [];
    for(let i = 0; i<5; i++){
        let bookLink = await newTab.evaluate(function(elem){
            return elem.getAttribute('href');
        }, booksATags[i]);
        booksLinks.push(bookLink);
        let completeBookLink = "https://www.amazon.in" + bookLink;
        await processingBooks(completeBookLink, browser, genrePath);
    } 
    newTab.close();
    

}

async function processingBooks(completeBookLink, browser, genrePath){
    
    let newTab = await browser.newPage();
    await newTab.goto(completeBookLink);
    let bookDes = [];
    
    await newTab.waitForSelector('#productTitle');
    let bookTitleTag = await newTab.$('#productTitle');
    let bookTitle = await newTab.evaluate(function(elem){
        return elem.innerText;

    }, bookTitleTag); 

    
    let bookAuthorTag = await newTab.$('.author.notFaded');
     let bookAuthor = await newTab.evaluate(function(elem) {
         return elem.innerText;
     }, bookAuthorTag);

    await newTab.waitForSelector('.a-section.a-spacing-none.a-text-center.rpi-attribute-value a span');

    let bookLengthTag = await newTab.$('.a-section.a-spacing-none.a-text-center.rpi-attribute-value a span');
    let bookLength = await newTab.evaluate(function(elem){
        return elem.innerText;
    }, bookLengthTag);
    

    await newTab.waitForSelector('.a-button.a-spacing-mini.a-button-toggle.format');
    let bookPriceAllTags = await newTab.$$('.a-button.a-spacing-mini.a-button-toggle.format');

    let bookPrices = [];
    let bookPricesObj = {};
    for(let i = 0; i<bookPriceAllTags.length; i++){
        let bookPrice = await newTab.evaluate(function(elem){
            return elem.innerText;
        }, bookPriceAllTags[i]);
        bookPrice = bookPrice.replace(/(\r\n|\n|\r)/gm, "");
        bookPricesObj[`Price ${i+1}`]= bookPrice.trim();

    }
    
    bookPrices.push(bookPricesObj);
    
    await newTab.waitForSelector('[data-hook="rating-out-of-text"]');
    let bookRatingsTag = await newTab.$('[data-hook="rating-out-of-text"]');
    let bookRatings = await newTab.evaluate(function(elem){
        return elem.innerText;
    }, bookRatingsTag);
    
    let bookObj = {
        Title: bookTitle,
        Author: bookAuthor,
        Length: bookLength,
        Prices: bookPrices,
        Ratings: bookRatings,
        Link: completeBookLink,

    }
    
    
    bookDes.push(bookObj);
    let stringifiedData = JSON.stringify(bookDes);
    await booknameFolder(bookTitle, genrePath, stringifiedData);
    
    newTab.close();
}

async function booknameFolder(bookTitle, genrePath, stringifiedData){
    bookTitle = bookTitle.replace(/[^a-zA-Z ]/g, "");
    let bookFolderPath = `${genrePath}/${bookTitle}`;
    console.log(bookTitle);
    if(!fs.existsSync(bookFolderPath)){
        await fs.promises.mkdir(bookFolderPath);        
    }

    await createJSON(bookTitle, bookFolderPath, stringifiedData);
}

async function createJSON(bookTitle, bookFolderPath, stringifiedData){
    let jsonFilePath = `${bookFolderPath}/${bookTitle}.json`;

    
    if(!fs.existsSync(jsonFilePath)){
        await fs.promises.writeFile(jsonFilePath, stringifiedData);
    }
    
}