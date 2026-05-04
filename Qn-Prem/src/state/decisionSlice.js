import { createSlice } from "@reduxjs/toolkit";
import { safeParseJsonResponse } from "../utils/safeParseJsonResponse";

const decisionSlice = createSlice({
  name: "decision",
  initialState: {
    analyseData: [],
    currentQnDoc: [],
    refQnDoc: [],
    historicalQn: [],
    currentQNFiles: [],
    historyQNFiles: [],
    historicalQnOptions: [],
  },
  reducers: {
    setAnalyseData: (state, action) => {
      // const analyseQn =  safeParseJsonResponse(action.payload);
      const analyseQn = action.payload;


      // if (!Array.isArray(analyseQn) || analyseQn.length < 3) {
      //   return;
      // }


      const {historicalQn, currentQNFiles, historyQNFiles} = analyseQn;

      state.analyseData = analyseQn;
      state.historicalQn = historicalQn;
      state.currentQNFiles = currentQNFiles;
      state.refQnDoc = historyQNFiles;


      state.historicalQnOptions = historicalQn.map((ele) => ({
        label: ele.QN,
        value: ele.QN,
      }));

      const [currentQnDoc, refQnDoc] = filterDocuments(historyQNFiles);
      state.currentQnDoc = currentQnDoc;
      state.refQnDoc = refQnDoc;
    },
  },
});

const filterDocuments = (documents) => {
  if (!Array.isArray(documents)) return [[], []];

  return documents.reduce(
    (acc, item) => {
      if (item.filename === "Dimensional Engine Manual.pdf") {
        acc[0].push(item); // refQnDoc
      } else {
        acc[1].push(item); // currentQnDoc
      }
      return acc;
    },
    [[], []]
  );
};

export const { setAnalyseData } = decisionSlice.actions;
export default decisionSlice.reducer;
