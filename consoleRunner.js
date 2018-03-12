import {createInterface} from 'readline';
import {URL} from 'url';
import request from 'request';

const readline = createInterface({
    input: process.stdin,
    output: process.stdout
});

const POSTCODES_BASE_URL = 'https://api.postcodes.io';
const TFL_BASE_URL = 'https://api.tfl.gov.uk';

export default class ConsoleRunner {

    getPostcodePromise() {
        return new Promise(function (resolve) {
            readline.question('\nEnter your postcode: ', function (postcode) {
                readline.close();
                resolve(postcode);
            });
        });
    }

    displayStopPoints(stopPoints) {
        stopPoints.forEach(point => {
            console.log(point.commonName);
        });
    }

    buildUrl(url, endpoint, parameters) {
        const requestUrl = new URL(endpoint, url);
        parameters.forEach(param => requestUrl.searchParams.append(param.name, param.value));
        return requestUrl.href;
    }

    makeGetRequestPromise(baseUrl, endpoint, parameters) {
        const url = this.buildUrl(baseUrl, endpoint, parameters);

        return new Promise(function (resolve, reject) {
            request.get(url, (err, response, body) => {
                if (err) {
                    console.log(err);
                } else if (response.statusCode !== 200) {
                    console.log(response.statusCode);
                } else {
                    resolve(body);
                }
            });
        });

    }

    getLocationForPostCode(postcode, that) {

        return new Promise(function (resolve, reject) {
            that.makeGetRequestPromise(POSTCODES_BASE_URL, `postcodes/${postcode}`, []).then((responseBody) => {

                const jsonBody = JSON.parse(responseBody);
                console.log(jsonBody.result.latitude);
                resolve({latitude: jsonBody.result.latitude, longitude: jsonBody.result.longitude});

            });
        });
    }

    getNearestStopPoints(latitude, longitude, count, that) {

        return new Promise(function (resolve) {
            that.makeGetRequestPromise(
                TFL_BASE_URL,
                `StopPoint`,
                [
                    {name: 'stopTypes', value: 'NaptanPublicBusCoachTram'},
                    {name: 'lat', value: latitude},
                    {name: 'lon', value: longitude},
                    {name: 'radius', value: 1000},
                    {name: 'app_id', value: '' /* Enter your app id here */},
                    {name: 'app_key', value: '' /* Enter your app key here */}
                ]).then((responseBody) => {
                const stopPoints = JSON.parse(responseBody).stopPoints.map(function (entity) {
                    return {naptanId: entity.naptanId, commonName: entity.commonName};
                }).slice(0, count);
                resolve(stopPoints);
            })
        })

    }

    async run() {

        const that = this;
        let postcode = await that.getPostcodePromise();

        postcode = postcode.replace(/\s/g, '');
        that.getLocationForPostCode(postcode, that).then((location) => {
            that.getNearestStopPoints(location.latitude, location.longitude, 5, that).then((stopPoints) => {
                that.displayStopPoints(stopPoints);
            });
        })
    }
}