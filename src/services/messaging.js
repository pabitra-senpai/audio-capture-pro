export async function send(msg) {
    try {
        await chrome.runtime.sendMessage(msg);
    }
    catch {
        /* background may briefly be reloading */
    }
}
