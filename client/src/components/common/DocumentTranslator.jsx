import { useEffect } from 'react';
import { hasDevanagari, translateUiText } from '../../i18n/runtimeTranslations';

const textOriginals = new WeakMap();
const translatableAttributes = ['placeholder', 'title', 'aria-label'];

function shouldSkipElement(element) {
  if (!element) return true;
  const blocked = element.closest(
    'script, style, code, pre, textarea, input, select, option, [contenteditable="true"], svg'
  );
  if (blocked) return true;

  return Boolean(element.closest('.material-symbols-outlined, .material-icons'));
}

function translateTextNode(node, lang) {
  const current = node.textContent;
  if (!current || !current.trim() || shouldSkipElement(node.parentElement)) return;

  const original = textOriginals.get(node);

  if (lang === 'en') {
    if (original && node.textContent !== original) node.textContent = original;
    return;
  }

  if (!original) {
    if (hasDevanagari(current)) return;
    const translated = translateUiText(current, lang);
    if (translated === current) return;
    textOriginals.set(node, current);
    node.textContent = translated;
    return;
  }

  const translated = translateUiText(original, lang);
  if (translated !== node.textContent) node.textContent = translated;
}

function translateAttributes(element, lang) {
  if (!element || shouldSkipElement(element)) return;

  for (const attr of translatableAttributes) {
    if (!element.hasAttribute(attr)) continue;

    const dataAttr = `data-i18n-original-${attr}`;
    const current = element.getAttribute(attr);
    const original = element.getAttribute(dataAttr);

    if (lang === 'en') {
      if (original) element.setAttribute(attr, original);
      continue;
    }

    if (!original) {
      if (!current || hasDevanagari(current)) continue;
      const translated = translateUiText(current, lang);
      if (translated === current) continue;
      element.setAttribute(dataAttr, current);
      element.setAttribute(attr, translated);
      continue;
    }

    const translated = translateUiText(original, lang);
    if (translated !== current) element.setAttribute(attr, translated);
  }
}

function translateTree(root, lang) {
  if (!root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, lang);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

  const elementRoot = root.nodeType === Node.ELEMENT_NODE ? root : root.body;
  if (!elementRoot) return;

  translateAttributes(elementRoot, lang);
  elementRoot.querySelectorAll?.('*').forEach((element) => translateAttributes(element, lang));

  const walker = document.createTreeWalker(elementRoot, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateTextNode(node, lang);
    node = walker.nextNode();
  }
}

export default function DocumentTranslator({ lang }) {
  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';

    let applying = false;
    let frame = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        applying = true;
        translateTree(document.body, lang);
        applying = false;
      });
    };

    apply();

    const observer = new MutationObserver((mutations) => {
      if (applying) return;
      if (mutations.some((mutation) => mutation.type !== 'attributes' || translatableAttributes.includes(mutation.attributeName))) {
        apply();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttributes,
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [lang]);

  return null;
}
