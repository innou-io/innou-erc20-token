const fs = require('fs');
const { balance, shouldFail } = require('openzeppelin-test-helpers');

module.exports = playScenario;

async function playScenario(steps, self, accounts, beforePlayCb, beforeAsertCb) {
    const [ deployer, owner, wallet, buyer1, buyer2, investor1, investor2 ] = accounts;

    return promiseSerial(
        steps.reduce(
            (promiseFns, step) => {
                step.beforeBalances = {};
                step.afterBalances = {};
                promiseFns.push(getBalancesPromiseFn(step.beforeBalances));
                promiseFns.push(getPlayPromiseFn(step));
                promiseFns.push(getBalancesPromiseFn(step.afterBalances));
                return promiseFns.concat(getAssertPromiseFns(step))
            },
            [],
        ).concat(getLoggingPromiseFn(steps)),
    );

    function promiseSerial(promiseFns) {
        return promiseFns.reduce(
            (promise, fn) =>
                promise.then(result =>
                    fn().then(Array.prototype.concat.bind(result))
                ),
            Promise.resolve([]),
        );
    }
    function getPlayPromiseFn(step) {
        return () => {
            if (beforePlayCb) { beforePlayCb(step); }
            const promise = step.shallRevert ?
                shouldFail.reverting(step.play(self)) :
                step.play(self).then((res) => { step.result = res; return res; });
            return promise
                .then((res) => {
                    step.done = true;
                    return res;
                });
        }
    }
    function getAssertPromiseFns(step) {
        return step.assertions ?
            step.assertions.map(a => getAssertPromiseFn(a, step)) : [];
    }
    function getAssertPromiseFn(assertion, step) {
        return () => {
            if (beforeAsertCb) { beforeAsertCb(assertion); }
            return assertion.test(self, step)
                .then((res) => { assertion.result = res; });
        }
    }
    function getBalancesPromiseFn(store) {
        return () => Promise.all([
            balance.current(deployer),
            balance.current(owner),
            balance.current(wallet),
            balance.current(buyer1),
            balance.current(buyer2),
            balance.current(investor1),
            balance.current(investor2),
        ]).then((values) => {
            [
                store.deployer,
                store.owner,
                store.wallet,
                store.buyer1,
                store.buyer2,
                store.investor1,
                store.investor2,
            ] = values;
        });
    }
    function getLoggingPromiseFn(steps) {
        return () => new Promise((resolve, reject) => {
            if (!process.env.INN_LOG_FILE) { resolve(); }
            fs.writeFile(
                process.env.INN_LOG_FILE,
                JSON.stringify(steps, null, 2),
                (err) => err ? reject(err) : resolve(),
            );

        });
    }
}
