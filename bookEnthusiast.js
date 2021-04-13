const puppeteer = require('puppeteer');
const fs = require("fs");
const cheerio = require("cheerio");
const request = require("request");

(async function(){
    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["-start-maximized"],
        // executablePath: 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'

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
    await tab.waitForSelector('.a-list-item a');
    let langTags = await tab.$$('.a-list-item a');
    
    for(let i = 3; i<9; i++){
        let langText = await tab.evaluate(function(elem){
            return elem.innerText;
        }, langTags[i]);
        console.log(langText);
        await langWise(browser, tab, langTags[i], langText, i);
    }
    
    
    tab.close();
    console.log("All of the books are stored in AMAZON folder...")
    browser.close();
    
})();

async function langWise(browser, tab, langTag, langText, i){
    
    let langLink = await tab.evaluate(function(elem){
        return elem.getAttribute('href');
    }, langTag);
    let completeLangLink = "https://www.amazon.in" + langLink;
    let newTab = await browser.newPage();

    await newTab.goto(completeLangLink);


    // await newTab.waitForSelector('.a-checkbox.a-checkbox-fancy.s-navigation-checkbox.aok-float-left');
    // let allLangTags = await newTab.$$('.a-checkbox.a-checkbox-fancy.s-navigation-checkbox.aok-float-left');
    // await newTab.evaluate(function(elem){
    //     return elem.click();

    // }, allLangTags[i]);


    
    // await tab.evaluate(function(elem){
    //     return elem.click();
    // }, langTag);

    
    let langFolderPath = `./AMAZON/${langText}`;
    
    if(!fs.existsSync(langFolderPath)){
        await fs.mkdirSync(langFolderPath);
    }

    await newTab.waitForSelector('#departments ul .a-spacing-micro.s-navigation-indent-2 a') ; 
    let genre = await newTab.$$('#departments ul .a-spacing-micro.s-navigation-indent-2 a');
    for(let i = 0; i<5; i++){
        let genreLink =  await newTab.evaluate(function(elem){
            return elem.getAttribute('href');
        }, genre[i]);
        let genreText = await newTab.evaluate(function(elem){
            return elem.text
        }, genre[i]);
        genreText = genreText.trim()
        completeGenreLink = "https://www.amazon.in" + genreLink
        await directingToGenre(completeGenreLink, browser, genreText, langFolderPath);
    }
    
    await newTab.close();

}


async function directingToGenre(completeGenreLink, browser, genreText, langFolderPath){
    
    
    let newTab = await browser.newPage();
    await newTab.goto(completeGenreLink);
    let genrePath = langFolderPath + `/${genreText}`;
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
    await newTab.waitForTimeout(13000);
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
    let kindlePriceTag = await newTab.$('#kindle-price')
    let kindlePrice = await newTab.evaluate(function(elem){
        return elem.innerText;
    }, kindlePriceTag);

    let bookPrices = [];
    let bookPricesObj = {};
    bookPricesObj[`Price 1`] = "kindle price without unlimited membership " + kindlePrice;
    for(let i = 1; i<bookPriceAllTags.length; i++){
        let bookPrice = await newTab.evaluate(function(elem){
            return elem.innerText;
        }, bookPriceAllTags[i]);
        bookPrice = bookPrice.replace(/(\r\n|\n|\r)/gm, "");
        bookPricesObj[`Price ${i+1}`]= bookPrice.trim();

    }
    
    bookPrices.push(bookPricesObj);
    let bookRatings = "no ratings"
    try{
        await newTab.waitForSelector('[data-hook="rating-out-of-text"]');
        let bookRatingsTag = await newTab.$('[data-hook="rating-out-of-text"]');
        bookRatings = await newTab.evaluate(function(elem){
            return elem.innerText;
        }, bookRatingsTag);
    }catch(error){
        if(error){
            bookRatings = "no ratings!";
        }
    }
    
    
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