import React from "react";
import { ZegoCloudRTCCore } from "../../../../modules";
import { userNameColor } from "../../../../util";
import ZegoUserListCss from "./zegoUserList.module.scss";
import { ZegoCloudUserList } from "../../../../modules/tools/UserListManager";
export class ZegoUserList extends React.Component<{
  core: ZegoCloudRTCCore;
  userList: ZegoCloudUserList;
  selfUserID: string;
  handleSetPin: Function;
}> {
  expandMemberMenu(userID: string | null) {
    const members = document.querySelectorAll(
      `.${ZegoUserListCss.memberMenuWrapper}`
    );
    members.forEach((m: any) => {
      if (m?.dataset.id === userID) {
        m.style.display = m.style.display === "block" ? "none" : "block";
      } else {
        m.style.display = "none";
      }
    });
  }

  render(): React.ReactNode {
    return (
      <div className={ZegoUserListCss.memberListWrapper}>
        {this.props.userList.map((user) => {
          return (
            <div
              className={ZegoUserListCss.member}
              onClick={() => this.expandMemberMenu(user.userID)}
              key={user.userID}
            >
              <span style={{ color: userNameColor(user.userName || "") }}>
                {user.userName?.slice(0, 1)?.toUpperCase()}
              </span>
              <div
                className={`${ZegoUserListCss.memberNameWrapper} ${ZegoUserListCss.memberGuestNameWrapper}`}
              >
                <p>{user.userName}</p>
                {user.userID === this.props.selfUserID && "(You)"}
              </div>
              {user.userID === this.props.selfUserID ? (
                <div className={ZegoUserListCss.selfStatusWrapper}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <div className={ZegoUserListCss.memberStatusWrapper}>
                  <span
                    className={`${ZegoUserListCss.memberMicIcon} ${
                      user.streamList[0].micStatus === "OPEN" &&
                      ZegoUserListCss.memberMicIconOpen
                    }`}
                  ></span>
                  <span
                    className={`${ZegoUserListCss.memberCameraIcon} ${
                      user.streamList[0].cameraStatus === "OPEN" &&
                      ZegoUserListCss.memberCameraIconOpen
                    }`}
                  ></span>
                  <span
                    className={`${ZegoUserListCss.memberPinIcon} ${
                      user.pin && ZegoUserListCss.memberPinIconOpen
                    }`}
                  ></span>
                </div>
              )}

              <div
                className={ZegoUserListCss.memberMenuWrapper}
                data-id={user.userID}
              >
                <div
                  className={ZegoUserListCss.memberMenuItem}
                  onClick={() => this.props.handleSetPin(user.userID)}
                >
                  {user.pin ? "Remove Pin" : "Pin"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
