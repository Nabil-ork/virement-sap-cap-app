sap.ui.define([
    "sap/m/MessageToast"
], function (MessageToast) {
    "use strict";

    /**
     * Resolve the binding context of the selected row from whatever Fiori Elements passes.
     *
     * FE calling conventions (differ by page type and action kind):
     *  A) (oEvent, aSelectedContexts[])  — custom table toolbar action
     *  B) (oBindingContext, ...)          — Object Page Identification action
     *  C) (oEvent)                        — DataFieldForAction override in List Report
     *     → traverse the component tree to reach the table and read selection
     */
    function _resolveContext(oFirst, oSecond) {

        // ── A: second arg is an array of binding contexts ─────────────────────
        if (Array.isArray(oSecond) && oSecond.length > 0) {
            if (oSecond.length !== 1) {
                MessageToast.show("Please select exactly one Journal Entry.");
                return null;
            }
            return oSecond[0];
        }

        // ── B: first arg IS a binding context (has getProperty, not getSource) ─
        if (oFirst
                && typeof oFirst.getProperty === "function"
                && typeof oFirst.getSource !== "function") {
            return oFirst;
        }

        // ── C: first arg is a UI5 Event ───────────────────────────────────────
        if (oFirst && typeof oFirst.getSource === "function") {
            try {
                const oSrc = oFirst.getSource();

                // Direct context on the source (Object Page bound button)
                if (oSrc && typeof oSrc.getBindingContext === "function") {
                    const oCtx = oSrc.getBindingContext();
                    if (oCtx && typeof oCtx.getProperty === "function") {
                        return oCtx;
                    }
                }

                // Walk up the component tree to find the table
                let oNode = oSrc;
                for (let i = 0; i < 20 && oNode; i++) {
                    oNode = typeof oNode.getParent === "function" ? oNode.getParent() : null;
                    if (!oNode) break;

                    // sap.ui.mdc.Table  ─ FE V4 standard table wrapper
                    if (typeof oNode.getSelectedContexts === "function") {
                        const aCtx = oNode.getSelectedContexts();
                        if (aCtx && aCtx.length === 1)  return aCtx[0];
                        if (aCtx && aCtx.length !== 1) {
                            MessageToast.show("Please select exactly one Journal Entry.");
                            return null;
                        }
                    }

                    // sap.m.Table  ─ ResponsiveTable inner control
                    if (typeof oNode.getSelectedItems === "function") {
                        const aItems = oNode.getSelectedItems();
                        if (aItems && aItems.length === 1) {
                            return aItems[0].getBindingContext();
                        }
                        if (aItems && aItems.length > 0) {
                            MessageToast.show("Please select exactly one Journal Entry.");
                            return null;
                        }
                    }
                }
            } catch (e) {
                // swallow navigation errors; fall through to the toast below
            }
        }

        MessageToast.show("Please select exactly one Journal Entry.");
        return null;
    }

    return {
        onPrint: function (oFirst, oSecond) {
            const oContext = _resolveContext(oFirst, oSecond);
            if (!oContext) return;

            const sId = oContext.getProperty("ID");
            if (!sId) {
                MessageToast.show("No ID found for the selected record.");
                return;
            }

            // Download the PDF automatically
            const sUrl = "/api/pdf/journal-entry/" + encodeURIComponent(sId);
            const oLink = document.createElement("a");
            oLink.href   = sUrl;
            oLink.download = "";
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
        }
    };
});
