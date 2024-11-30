const { parentPort, workerData } = require("worker_threads");

const fib = (index) => {
    if (index == 0) return 0;
    if (index == 1 || index == 2) return 1;

    return fib(index - 1) + fib(index - 2);
};

parentPort?.postMessage(fib(workerData));
