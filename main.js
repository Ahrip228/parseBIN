const fetch = require('node-fetch');
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
        console.error('Ошибка при чтении файла currencies.json: ', error);
        return [];
    }
}

function calculateCrossRates(rates) {
    let crossRates = [];
    let rateMap = {};

    rates.forEach(rate => {
        rateMap[rate.from] = parseFloat(rate.out);
    });

    rates.forEach(fromRate => {
        rates.forEach(toRate => {
            if (fromRate.from !== toRate.from) {
                const crossRateValue = rateMap[fromRate.from] / rateMap[toRate.from];
                crossRates.push({
                    from: fromRate.from,
                    to: toRate.from,
                    out: crossRateValue.toFixed(6)
                });
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
                ratesData.push({ from: currency, to: 'USDT', out: rate });
            }
        }

        fs.writeFileSync('rates.json', JSON.stringify(ratesData, null, 4));

        const crossRates = calculateCrossRates(ratesData);
        fs.writeFileSync('crossRates.json', JSON.stringify(crossRates, null, 4));

        console.log('Курсы криптовалют сохранены в файл rates.json и кросс-курсы в crossRates.json');
    } catch (error) {
        console.error('Ошибка: ', error);
    }
}

main();
