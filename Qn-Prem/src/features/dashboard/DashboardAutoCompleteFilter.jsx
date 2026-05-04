import { UndoOutlined } from "@ant-design/icons";
import { AutoComplete, Button, Input, Space } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { resetFilters, setFilters } from "../../state/qnSlice";

const { Search } = Input;

const DashboardAutoCompleteFilter = ({ data }) => {
  const filters = useSelector((state) => state.qn.filters);
  const dispatch = useDispatch();

  const isFilterActive = Boolean(
    filters.Rev || filters.MQI || filters["Vendor"] || filters.searchText
  );

  const renderAutoComplete = (field, placeholder, width = 150) => {
    const uniqueValues = [...new Set(data.map((item) => item[field]))].filter(Boolean);
    const options = uniqueValues.map((val) => ({ value: String(val) }));

    return (
      <AutoComplete
        options={options}
        style={{ width }}
        placeholder={placeholder}
        value={filters[field] || undefined}
        onChange={(value) => dispatch(setFilters({ [field]: value }))}
        // onSelect={(value) => dispatch(setFilters({ [field]: value }))}
        // onChange={(value) => {
        //   if (!value) dispatch(setFilters({ [field]: "" }));
        // }}
        allowClear
        filterOption={(inputValue, option) =>
            (option?.value?.toLowerCase() || '').includes(inputValue.toLowerCase())
        }
      />
    );
  };

  const handleResetFilters = () => {
    // dispatch(setFilters({
    //   Rev: "",
    //   MQI: "",
    //   "Vendor Code": "",
    //   searchText: ""
    // }));
    dispatch(resetFilters())
  };

  return (
    <Space direction="horizontal" size="small">
      {renderAutoComplete("Rev", "Filter by Revision")}
      {renderAutoComplete("MQI", "Filter by MQI")}
      {renderAutoComplete("Vendor", "Filter by Vendor", 170)}
      <Search
        placeholder="Search"
        allowClear
        value={filters.searchText}
        onChange={(e) => dispatch(setFilters({ searchText: e.target.value }))}
        style={{ width: 200 }}
      />
      {isFilterActive &&
      <Button icon={<UndoOutlined />} onClick={handleResetFilters} />
     }
    </Space>
  );
};

export default DashboardAutoCompleteFilter;
