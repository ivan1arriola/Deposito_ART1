"use client";

import createCache, { type Options as EmotionCacheOptions } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import { ReactNode, useState } from "react";

type ThemeRegistryProps = {
  children: ReactNode;
  options?: EmotionCacheOptions;
};

export function ThemeRegistry({ children, options = { key: "mui" } }: ThemeRegistryProps) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache(options);
    cache.compat = true;

    const prevInsert = cache.insert;
    let inserted: string[] = [];

    cache.insert = (...args: Parameters<typeof prevInsert>) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };

    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };

    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();

    if (names.length === 0) {
      return null;
    }

    let styles = "";
    for (const name of names) {
      const style = cache.inserted[name];
      if (typeof style === "string") {
        styles += style;
      }
    }

    return <style data-emotion={`${cache.key} ${names.join(" ")}`} dangerouslySetInnerHTML={{ __html: styles }} />;
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
