const fetch = require('node-fetch');
const { js2xml, xml2js } = require('xml-js');
const fs = require('fs');

async function getCryptoRate(from, to) {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${from}${to}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.price;
    } catch (error) {
        console.error(`Ошибка при получении курса для пары ${from}-${to}: `, error);
        return null;
    }
}

function getCurrenciesFromFile() {
    try {
        const jsonData = fs.readFileSync('currencies.json', 'utf8');
        return JSON.parse(jsonData);
    } catch (error) {
        console.error('Ошибка при чтении или разборе файла currencies.json: ', error);
        return [];
    }
}

function createXml(data) {
    let rates = { rates: { item: data } };
    return js2xml(rates, { compact: true, spaces: 4 });
}

function readXmlFile(filePath) {
    try {
        const xmlData = fs.readFileSync(filePath, 'utf8');
        const result = xml2js(xmlData, { compact: true, alwaysArray: true });
        return result.rates.item || [];
    } catch (error) {
        console.error(`Ошибка при чтении файла ${filePath}: `, error);
        return [];
    }
}

function calculateCrossRates(rates) {
    let crossRates = [];
    rates.forEach(fromRate => {
        rates.forEach(toRate => {
            if (fromRate.from._text !== toRate.from._text) {
                const crossRateValue = parseFloat(fromRate.out._text) / parseFloat(toRate.out._text);
                const crossRate = {
                    from: { _text: fromRate.from._text },
                    to: { _text: toRate.from._text },
                    out: { _text: crossRateValue.toFixed(6) }
                };
                crossRates.push({ item: crossRate });
            }
        });
    });
    return crossRates;
}

async function main() {
    try {
        const currencies = getCurrenciesFromFile();
        let ratesData = [];

        for (let currency of currencies) {
            const rate = await getCryptoRate(currency, 'USDT');
            if (rate) {
                ratesData.push({ from: { _text: currency }, to: { _text: 'USDT' }, out: { _text: rate } });
            }
        }

        const ratesXml = createXml(ratesData);
        fs.writeFileSync('rates.xml', ratesXml);

        const savedRates = readXmlFile('rates.xml');
        const crossRates = calculateCrossRates(savedRates);

        // Добавим логирование для отладки
        console.log('Сгенерированные кросс-курсы:', crossRates);

        const crossRatesXml = createXml(crossRates);
        fs.writeFileSync('rates1.xml', crossRatesXml);

        console.log('Курсы криптовалют сохранены в файл rates.xml и кросс-курсы в rates1.xml');
    } catch (error) {
        console.error('Ошибка: ', error);
    }
}

main();
