# Figma 取り込み用の書き出し

## ファイル

- `koln-kawagoe-design.html` … 鉄板焼ケルン 川越のデザイン案（1枚完結・約2.7MB）

CSS と画像をすべてファイル内に埋め込んであるので、単体で開けます。
サーバーも画像フォルダも要りません。

## Figma への取り込み方

1. Figma で `html.to.design` プラグインを起動
2. 「Import HTML code」を選び、このファイルの中身を貼り付ける
   （または「Import from URL」に Vercel のURLを入れる）
3. 取り込み幅は **1440px**（PC）／**390px**（スマホ）がおすすめ

## 元ファイルとの関係

書き出し元は `index.html` と `css/style.css` + `css/koln.css` です。
**書き出しファイルは直接編集しないでください。** 元を直してから作り直します。

```
python3 tools/export_design.py index.html design-export/koln-kawagoe-design.html
```

## 書き出し時に加えている調整

元のデザインは JavaScript でスクロールに合わせて要素を出しています。
Figma には JS が無いので、書き出しでは次の状態に固定しています。

- `body` に `is-loaded` を付与（ヒーローの文字などを表示状態に）
- `.reveal` 系をすべて表示済みに固定
- ローディング画面と追従ボタンを非表示
- ヘッダーを `position:absolute` に（Figma で重ならないように）
- 横スライドは折り返して全件見えるように
- Google マップの iframe はプレースホルダに置き換え

元の CSS には一切手を入れていません。上書き用の `<style>` を末尾に足しているだけです。
