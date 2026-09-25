// Необработанное JS-исключение (из эффекта, таймера или обработчика события)
// в release-сборке помечается как fatal, и Android закрывает приложение молча:
// ни экрана ошибки, ни текста — пользователь просто оказывается на рабочем
// столе, а мы не знаем, что упало.
//
// Перехватываем такие ошибки и отдаём ErrorBoundary: вместо исчезновения
// пользователь видит сообщение (его можно скопировать и прислать) и кнопку
// «Try Again». В dev ничего не меняем — redbox информативнее.

let listener = null;
let installed = false;

function install() {
  if (installed) return;
  const utils = global.ErrorUtils;
  if (!utils?.setGlobalHandler) return;
  installed = true;

  const previous = utils.getGlobalHandler?.();
  utils.setGlobalHandler((error, isFatal) => {
    if (__DEV__ || !isFatal || !listener) {
      previous?.(error, isFatal);
      return;
    }
    listener(error);
  });
}

/**
 * Подписывает экран ошибки на фатальные исключения вне React-рендера.
 * @param {(error: Error) => void} fn
 * @returns {() => void} отписка
 */
export function onFatalError(fn) {
  listener = fn;
  install();
  return () => {
    if (listener === fn) listener = null;
  };
}
