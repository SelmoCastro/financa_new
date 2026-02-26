module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            // NativeWind v4: jsxImportSource substitui o preset legado 'nativewind/babel'
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
        ],
    };
};
