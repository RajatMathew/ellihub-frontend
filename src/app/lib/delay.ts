// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DelayForDemo = async (promise: Promise<any>, delay = 3000) => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  }).then(() => promise);
};
export default DelayForDemo;
