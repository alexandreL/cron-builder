"use strict";
/* eslint-disable @typescript-eslint/ban-ts-comment */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronBuilder = void 0;
const DEFAULT_INTERVAL = ['*'];
class CronValidator {
    /**
     * Contains the position-to-name mapping of the cron expression
     * @type {Object}
     * @const
     */
    measureOfTimeMap = {
        0: 'minute',
        1: 'hour',
        2: 'dayOfTheMonth',
        3: 'month',
        4: 'dayOfTheWeek'
    };
    /**
     * contains every permissible 'measureOfTime' string constant
     * @const
     * @type {Array}
     */
    measureOfTimeValues = Object.values(this.measureOfTimeMap);
    /**
     * validates a given cron expression (object) for length, then calls validateValue on each value
     * @param {!{
        minute: Array<string>,
        hour: Array<string>,
        dayOfTheMonth: Array<string>,
        month: Array<string>,
        dayOfTheWeek: Array<string>,
     * }} expression - rich object containing the state of the cron expression
     * @throws {Error} if expression contains more than 5 keys
     */
    validateExpression(expression) {
        // don't care if it's less than 5, we'll just set those to the default '*'
        if (Object.keys(expression).length > 5) {
            throw new Error('Invalid cron expression; limited to 5 values.');
        }
        for (const measureOfTime in expression) {
            // @ts-ignore
            if (expression[measureOfTime]) {
                // @ts-ignore
                this.validateValue(measureOfTime, expression[measureOfTime]);
            }
        }
    }
    /**
     * validates a given cron expression (string) for length, then calls validateValue on each value
     * @param {!String} expression - an optionally empty string containing at most 5 space delimited expressions.
     * @throws {Error} if the string contains more than 5 space delimited parts.
     */
    validateString(expression) {
        const splitExpression = expression.split(' ');
        if (splitExpression.length > 5) {
            throw new Error('Invalid cron expression; limited to 5 values.');
        }
        for (let i = 0; i < splitExpression.length; i++) {
            // @ts-ignore
            this.validateValue(this.measureOfTimeMap[i], splitExpression[i]);
        }
    }
    /**
     * validates any given measureOfTime and corresponding value
     * @param {!String} measureOfTime - as expected
     * @param {!String} value - the cron-ish interval specifier
     * @throws {Error} if measureOfTime is bogus
     * @throws {Error} if value contains an unsupported character
     */
    validateValue(measureOfTime, value) {
        const validatorObj = {
            minute: { min: 0, max: 59 },
            hour: { min: 0, max: 23 },
            dayOfTheMonth: { min: 1, max: 31 },
            month: { min: 1, max: 12 },
            dayOfTheWeek: { min: 0, max: 7 }
        };
        let range;
        const validChars = /^[0-9*-]/;
        // @ts-ignore
        if (!validatorObj[measureOfTime]) {
            throw new Error('Invalid measureOfTime; Valid options are: ' + this.measureOfTimeValues.join(', '));
        }
        if (!validChars.test(value)) {
            throw new Error('Invalid value; Only numbers 0-9, "-", and "*" chars are allowed');
        }
        if (value !== '*') {
            // check to see if value is within range if value is not '*'
            if (value.indexOf('-') >= 0) {
                // value is a range and must be split into high and low
                range = value.split('-');
                if (!range[0] || parseInt(range[0]) < validatorObj[measureOfTime].min) {
                    throw new Error('Invalid value; bottom of range is not valid for "' + measureOfTime + '". Limit is ' + validatorObj[measureOfTime].min + '.');
                }
                if (!range[1] || parseInt(range[1]) > validatorObj[measureOfTime].max) {
                    throw new Error('Invalid value; top of range is not valid for "' + measureOfTime + '". Limit is ' + validatorObj[measureOfTime].max + '.');
                }
            }
            else {
                if (parseInt(value) < validatorObj[measureOfTime].min) {
                    throw new Error('Invalid value; given value is not valid for "' + measureOfTime + '". Minimum value is "' + validatorObj[measureOfTime].min + '".');
                }
                if (parseInt(value) > validatorObj[measureOfTime].max) {
                    throw new Error('Invalid value; given value is not valid for "' + measureOfTime + '". Maximum value is "' + validatorObj[measureOfTime].max + '".');
                }
            }
        }
    }
}
/**
 * Initializes a CronBuilder with an optional initial cron expression.
 * @param {String=} initialExpression - if provided, it must be up to 5 space delimited parts
 * @throws {Error} if the initialExpression is bogus
 * @constructor
 */
class CronBuilder {
    expression;
    cronValidator;
    constructor(initialExpression) {
        this.cronValidator = new CronValidator();
        if (initialExpression) {
            this.cronValidator.validateString(initialExpression);
            const splitExpression = initialExpression.split(' ');
            // check to see if initial expression is valid
            this.expression = {
                minute: splitExpression[0] ? [splitExpression[0]] : DEFAULT_INTERVAL,
                hour: splitExpression[1] ? [splitExpression[1]] : DEFAULT_INTERVAL,
                dayOfTheMonth: splitExpression[2] ? [splitExpression[2]] : DEFAULT_INTERVAL,
                month: splitExpression[3] ? [splitExpression[3]] : DEFAULT_INTERVAL,
                dayOfTheWeek: splitExpression[4] ? [splitExpression[4]] : DEFAULT_INTERVAL,
            };
        }
        else {
            this.expression = {
                minute: DEFAULT_INTERVAL,
                hour: DEFAULT_INTERVAL,
                dayOfTheMonth: DEFAULT_INTERVAL,
                month: DEFAULT_INTERVAL,
                dayOfTheWeek: DEFAULT_INTERVAL,
            };
        }
    }
    /**
     * builds a working cron expression based on the state of the cron object
     * @returns {string} - working cron expression
     */
    build() {
        return [
            this.expression.minute.join(','),
            this.expression.hour.join(','),
            this.expression.dayOfTheMonth.join(','),
            this.expression.month.join(','),
            this.expression.dayOfTheWeek.join(','),
        ].join(' ');
    }
    /**
     * adds a value to what exists currently (builds)
     * @param {!String} measureOfTime
     * @param {!String} value
     * @throws {Error} if measureOfTime or value fail validation
     */
    addValue(measureOfTime, value) {
        this.cronValidator.validateValue(measureOfTime, value);
        if (this.expression[measureOfTime].length === 1 && this.expression[measureOfTime][0] === '*') {
            this.expression[measureOfTime] = [value];
        }
        else if (this.expression[measureOfTime].indexOf(value) < 0) {
            this.expression[measureOfTime].push(value);
        }
    }
    /**
     * removes a single explicit value (subtracts)
     * @param {!String} measureOfTime - as you might guess
     * @param {!String} value - the offensive value
     * @throws {Error} if measureOfTime is bogus.
     */
    removeValue(measureOfTime, value) {
        if (!this.expression[measureOfTime]) {
            throw new Error('Invalid measureOfTime: Valid options are: ' + this.cronValidator.measureOfTimeValues.join(', '));
        }
        if (this.expression[measureOfTime].length === 1 && this.expression[measureOfTime][0] === '*') {
            return 'The value for "' + measureOfTime + '" is already at the default value of "*" - this is a no-op.';
        }
        this.expression[measureOfTime] = this.expression[measureOfTime].filter((timeValue) => {
            return value !== timeValue;
        });
        if (!this.expression[measureOfTime].length) {
            this.expression[measureOfTime] = DEFAULT_INTERVAL;
        }
    }
    /**
     * returns the current state of a given measureOfTime
     * @param {!String} measureOfTime one of "minute", "hour", etc
     * @returns {!String} comma separated blah blah
     * @throws {Error} if the measureOfTime is not one of the permitted values.
     */
    get(measureOfTime) {
        if (!this.expression[measureOfTime]) {
            throw new Error('Invalid measureOfTime: Valid options are: ' + this.cronValidator.measureOfTimeValues.join(', '));
        }
        return this.expression[measureOfTime].join(',');
    }
    /**
     * sets the state of a given measureOfTime
     * @param {!String} measureOfTime - yup
     * @param {!Array.<String>} value - the 5 tuple array of values to set
     * @returns {!String} the comma separated version of the value that you passed in
     * @throws {Error} if your "value" is not an Array&lt;String&gt;
     * @throws {Error} when any item in your value isn't a legal cron-ish descriptor
     */
    set(measureOfTime, value) {
        if (!Array.isArray(value)) {
            throw new Error('Invalid value; Value must be in the form of an Array.');
        }
        for (let i = 0; i < value.length; i++) {
            this.cronValidator.validateValue(measureOfTime, value[i]);
        }
        this.expression[measureOfTime] = value;
        return this.expression[measureOfTime].join(',');
    }
    /**
     * Returns a rich object that describes the current state of the cron expression.
     * @returns {!{
            minute: Array<string>,
            hour: Array<string>,
            dayOfTheMonth: Array<string>,
            month: Array<string>,
            dayOfTheWeek: Array<string>,
     * }}
     */
    getAll() {
        return this.expression;
    }
    /**
     * sets the state for the entire cron expression
     * @param {!{
            minute: Array<string>,
            hour: Array<string>,
            dayOfTheMonth: Array<string>,
            month: Array<string>,
            dayOfTheWeek: Array<string>,
           }} expToSet - the entirety of the cron expression.
     * @throws {Error} as usual
     */
    setAll(expToSet) {
        this.cronValidator.validateExpression(expToSet);
        this.expression = expToSet;
    }
}
exports.CronBuilder = CronBuilder;
//# sourceMappingURL=cron-builder.js.map