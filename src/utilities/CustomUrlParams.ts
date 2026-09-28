/**
 * Custom URLSearchParams creator.
 * Creates an object by translating the query-string present in the URL into an object with respective key-value pairs.
 * Is needed because the native URLSearchParams-API parses the query string in unexpected ways.
 * Using encodeURIComponent and decodeURIComponent leads to different (=correct) results than "new URLSearchParams" and
 * the respective .toString()-method.
 */
export class CustomUrlParams {
    private qs: string;
    public params: { [key: string]: string } = {};
    constructor(search: string) {
        this.qs = (search || window.location.search).substr(1);
        this.pareQueryString();
    }
    pareQueryString() {
        this.qs.split('&').reduce((a, b) => {
            let [key, val] = b.split('=');
            //@ts-ignore
            a[key] = val;
            return a;
        }, this.params);

        for (const [key, value] of Object.entries(this.params)) {
            if (key === '') {
                delete this.params[''];
            }
        }
    }
    returnQueryString() {
        let newQueryString = '?';
        for (const [key, value] of Object.entries(this.params)) {
            newQueryString += key + '=' + value + '&';
        }
        newQueryString = newQueryString.slice(0, -1);
        return newQueryString;
    }
    get(key: string) {
        return this.params[key];
    }
}
