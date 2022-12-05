import React from "react";
import ShowPCManageContext, { ShowManageType } from "../../../context/showManage";
export declare class ZegoWhiteboardToolsPenTooTips extends React.PureComponent<{
    onToolChange: (fontSize: number, color: string) => void;
    onClose: () => void;
    rows: 1 | 2 | undefined;
}> {
    static contextType?: React.Context<ShowManageType>;
    context: React.ContextType<typeof ShowPCManageContext>;
    OnDocumentClick(ev: MouseEvent): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): React.ReactNode;
}
