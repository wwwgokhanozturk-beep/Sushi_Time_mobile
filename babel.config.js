module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      // В релизной сборке вырезаем console.* — 20 вызовов, среди которых лог
      // адреса API и предупреждения сетевых ошибок. В проде они бесполезны
      // (никто их не видит), но каждый вызов остаётся работой на каждом кадре
      // и утечкой внутренних деталей в системный лог устройства.
      // console.error оставляем: его читает ErrorBoundary и crash-репорты.
      production: {
        plugins: [['transform-remove-console', { exclude: ['error'] }]],
      },
    },
  };
};
