import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { qnAPI } from "../api";
import { STATUS_BACKEND_VALUE } from "@/constants";

export const fetchQnData = createAsyncThunk("qn/fetchQnData", async () => {
  const response = await qnAPI.getQnMenu();
  return response.data;
});

const filterByStatus = (data = [], status) =>
  data.filter((ele) => ele.status === status);

const categorizeData = (data) => ({
  pending: filterByStatus(data, STATUS_BACKEND_VALUE.pending),
  analyse: filterByStatus(data, STATUS_BACKEND_VALUE.analyse),
  accept: filterByStatus(data, STATUS_BACKEND_VALUE.accept),
  reject: filterByStatus(data, STATUS_BACKEND_VALUE.reject),
});

const applyFilters = (data, filters) => {
  const { Rev, MQI, searchText, ["Vendor Code"]: vendorCode } = filters;
  const hasSearch = !!searchText?.trim();

  return data.filter((item) => {
    const matchesRev = !Rev || item.Rev == Rev;
    const matchesMQI = !MQI || item.MQI == MQI;
    const matchesVendor = !vendorCode || item["Vendor Code"] == vendorCode;

    const matchesSearch =
      !hasSearch ||
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(searchText.toLowerCase())
      );

    return matchesRev && matchesMQI && matchesVendor && matchesSearch;
  });
};

const initialFilterState = {
  Rev: "",
  MQI: "",
  "Vendor Code": "",
  searchText: "",
};

const initialState  = {
  data: [],
  statusGroups: {
    pending: [],
    analyse: [],
    accept: [],
    reject: [],
  },
  filteredData: [],
  qnOptions: [],
  selectedOptionValue: null,
  selectedQn: null,
  selectedStatus: "ALL",
  filters: {...initialFilterState},
  loading: false,
}

const qnSlice = createSlice({
  name: "qn",
  initialState: initialState,
  reducers: {
    setSelectedStatus: (state, action) => {
      state.selectedStatus = action.payload;
    },
    setSelectedQnByNumber: (state, action) => {
      const qnNumber = action.payload;
      state.selectedQn = state.data.find((qn) => qn.QN === qnNumber) || null;
      state.selectedOptionValue = qnNumber;
    },
    setSelectedQn: (state, action) => {
      const qn = action.payload;
      state.selectedQn = qn;
      state.selectedOptionValue = qn?.QN || null;
    },
    setFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
      const filtered = applyFilters(state.data, state.filters);
      state.filteredData = filtered;
      state.statusGroups = categorizeData(filtered);
    },
    resetFilters: (state) => {
      state.filters = {...initialFilterState}
      const filtered = [...state.data];
      state.filteredData = filtered;
      state.statusGroups = categorizeData(filtered);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQnData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQnData.fulfilled, (state, action) => {
        const fullData = action.payload.data;
        state.data = fullData;
        state.filteredData = applyFilters(fullData, state.filters);
        state.statusGroups = categorizeData(state.filteredData);
        state.qnOptions = fullData.map((ele) => ({
          label: ele.QN,
          value: ele.QN,
        }));
        // Safety check: only set selectedOptionValue and selectedQn if data exists
        if (fullData && fullData.length > 0) {
          state.selectedOptionValue = fullData[0].QN;
          state.selectedQn = fullData[0];
        } else {
          state.selectedOptionValue = null;
          state.selectedQn = null;
        }
        state.loading = false;
      })
      .addCase(fetchQnData.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const {
  setSelectedStatus,
  setSelectedQnByNumber,
  setSelectedQn,
  setFilters,
  resetFilters,
} = qnSlice.actions;
export default qnSlice.reducer;
