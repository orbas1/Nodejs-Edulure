export function normaliseHeaders(raw) {
    if (!raw) {
        return {};
    }
    const resolved = {};
    for (const [key, value] of Object.entries(raw)) {
        if (value === undefined || value === null) {
            continue;
        }
        resolved[key] = String(value);
    }
    return resolved;
}
export function mergeHeaderProducers(producers, staticUserAgent) {
    if (!producers.length && !staticUserAgent) {
        return undefined;
    }
    return async (options) => {
        const headers = {};
        for (const producer of producers) {
            const output = await producer(options);
            for (const [key, value] of Object.entries(output)) {
                if (value === undefined || value === null) {
                    continue;
                }
                headers[key] = value;
            }
        }
        if (staticUserAgent && !('User-Agent' in headers) && !('user-agent' in headers)) {
            headers['User-Agent'] = staticUserAgent;
        }
        return headers;
    };
}
//# sourceMappingURL=base.js.map