/* 자동 생성: public/img/icon/*.svg 에서 가져온 아이콘. 색은 글자색(currentColor)을 따른다. */
const PATHS = {
  "settings": "<path d=\"M4 7H12M20 7H19M4 17H5M12 17H20\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"15.5\" cy=\"7\" r=\"2.5\" stroke-width=\"1.5\"/><circle cx=\"8.5\" cy=\"17\" r=\"2.5\" stroke-width=\"1.5\"/>",
  "more": "<path d=\"M5 12H5.01M12 12H12.01M19 12H19.01\" stroke-width=\"2.6\" stroke-linecap=\"round\"/>",
  "arrow-left": "<path d=\"M9.57 5.93005L3.5 12.0001L9.57 18.0701\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M20.5 12H3.67004\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "arrow-right": "<path d=\"M14.4301 5.93005L20.5001 12.0001L14.4301 18.0701\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M3.5 12H20.33\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "beaker": "<path d=\"M8.16004 22C3.98004 22 3.14004 19.47 4.50004 16.39L8.75004 6.74H8.45004C7.80004 6.74 7.20004 6.48 6.77004 6.05C6.33004 5.62 6.07004 5.02 6.07004 4.37C6.07004 3.07 7.13004 2 8.44004 2H15.55C16.21 2 16.8 2.27 17.23 2.7C17.79 3.26 18.07 4.08 17.86 4.95C17.59 6.03 16.55 6.74 15.44 6.74H15.28L19.5 16.4C20.85 19.48 19.97 22 15.83 22H8.16004Z\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M5.93994 13.12C5.93994 13.12 8.99994 13 11.9999 14C14.9999 15 17.8299 13.11 17.8299 13.11\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "copy": "<path d=\"M17 13.4V16.4C17 20.4 15.4 22 11.4 22H7.6C3.6 22 2 20.4 2 16.4V12.6C2 8.6 3.6 7 7.6 7H10.6\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M17 13.4H13.8C11.4 13.4 10.6 12.6 10.6 10.2V7L17 13.4Z\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M11.6 2H15.6\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M7 5C7 3.34 8.34 2 10 2H12.62\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M21.9999 8V14.19C21.9999 15.74 20.7399 17 19.1899 17\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M22 8H19C16.75 8 16 7.25 16 5V2L22 8Z\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "export": "<path d=\"M16.44 8.90002C20.04 9.21002 21.51 11.06 21.51 15.11V15.24C21.51 19.71 19.72 21.5 15.25 21.5H8.73998C4.26998 21.5 2.47998 19.71 2.47998 15.24V15.11C2.47998 11.09 3.92998 9.24002 7.46998 8.91002\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M12 15V3.62\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M15.35 5.85L12 2.5L8.65002 5.85\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "minus": "<path d=\"M6 12H18\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "next": "<path d=\"M8.91003 19.92L15.43 13.4C16.2 12.63 16.2 11.37 15.43 10.6L8.91003 4.07996\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "toward": "<path d=\"M15 19.92L8.47997 13.4C7.70997 12.63 7.70997 11.37 8.47997 10.6L15 4.07996\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "check": "<path d=\"M5 12.5L10 17.5L19 7.5\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "close": "<path d=\"M6 6L18 18M18 6L6 18\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "plus": "<path d=\"M6 12H18M12 6V18\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, className }: { name: IconName; size?: 16 | 20 | 24; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}

const LOGO = "<path d=\"M1.57227 4.60547H4.53125V10.5332L10.0879 4.60547H13.9746L8.07617 10.5332L14.2773 19H10.4102L5.9668 12.7109L4.53125 14.1855V19H1.57227V4.60547ZM19.3121 13.5605H22.9645L21.1676 7.89648L19.3121 13.5605ZM19.4977 4.60547H22.8961L27.9937 19H24.732L23.8043 16.041H18.5016L17.5055 19H14.3609L19.4977 4.60547ZM39.8742 7.1543H32.257V10.2109H39.2492V12.7109H32.257V16.4121H40.2258V19H29.3176V4.60547H39.8742V7.1543ZM41.95 19V4.60547H44.9285V10.0938H50.5535V4.60547H53.5418V19H50.5535V12.5742H44.9285V19H41.95ZM59.7582 13.5605H63.4105L61.6137 7.89648L59.7582 13.5605ZM59.9437 4.60547H63.3422L68.4398 19H65.1781L64.2504 16.041H58.9477L57.9516 19H54.807L59.9437 4.60547ZM80.3203 7.1543H72.7031V10.2109H79.6953V12.7109H72.7031V16.4121H80.6719V19H69.7637V4.60547H80.3203V7.1543Z\" fill=\"currentColor\"/>";
export function Logo({ height = 24, className }: { height?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={(82 / 24) * height}
      height={height}
      viewBox="0 0 82 24"
      fill="none"
      role="img"
      aria-label="KAEHAE"
      dangerouslySetInnerHTML={{ __html: LOGO }}
    />
  );
}
