"use client";

/* 개인정보 안내: 입장 전 한 줄 고지와, 눌렀을 때 뜨는 요약 시트 */

import { BottomSheet, Button, TextButton } from "@/components/ui";
import { OPERATOR, RETENTION_DAYS } from "@/lib/site";

/** 버튼 아래 한 줄 고지 */
export function PrivacyLine({ onOpen }: { onOpen: () => void }) {
  return (
    <p className="privacy-line">
      <button type="button" onClick={onOpen}>개인정보 처리 안내</button>
    </p>
  );
}

export function PrivacySheet({ open, onClose, role }: { open: boolean; onClose: () => void; role: "researcher" | "owner" }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="개인정보 처리 안내" desc="로그인 없이 쓰는 서비스라, 꼭 필요한 것만 받습니다."
      actions={<>
        <Button block onClick={onClose}>확인했습니다</Button>
        <TextButton size="sm" onClick={() => window.open("/privacy", "_blank", "noopener")}>전문 보기</TextButton>
      </>}>
      <dl className="privacy-list">
        <div><dt>받는 정보</dt><dd>{role === "researcher" ? "이름(닉네임), 연구 대상과의 관계·알고 지낸 기간, 문항에 남긴 답과 한 줄 소견" : "이름(닉네임), 고른 실험 구성, 셀프 캐해 답. 카카오로 열쇠를 보관하면 카카오 회원번호. 프로필 사진은 서버에 저장하지 않습니다."}</dd></div>
        <div><dt>쓰는 곳</dt><dd>{role === "researcher" ? "연구 대상의 ‘캐해 리포트’를 만드는 데에만 씁니다." : "연구소를 열고 리포트를 보여 주는 데에만 씁니다."}</dd></div>
        <div><dt>보는 사람</dt><dd>{role === "researcher" ? "연구소 주인(연구 대상)만 봅니다. 마지막에 ‘익명’을 고르면 이름은 주인에게도 전달되지 않습니다." : "초대 링크를 받은 사람에게는 이름만 보입니다. 리포트는 열쇠 링크를 가진 사람만 볼 수 있습니다."}</dd></div>
        <div><dt>보관 기간</dt><dd>마지막 표본이 들어온 뒤 {RETENTION_DAYS}일이 지나면 연구소와 모든 답을 자동으로 지웁니다. 주인이 그 전에 삭제할 수도 있습니다.</dd></div>
        <div><dt>삭제 요청</dt><dd>{OPERATOR.email ? `${OPERATOR.email} 로 요청하시면 지워 드립니다.` : "문의처는 정식 공개 전에 안내됩니다."}</dd></div>
      </dl>
      <p className="privacy-note">만 14세 미만은 이용할 수 없습니다. 답변에 다른 사람의 실명·연락처·주소 같은 개인정보는 적지 말아 주세요.</p>
    </BottomSheet>
  );
}
