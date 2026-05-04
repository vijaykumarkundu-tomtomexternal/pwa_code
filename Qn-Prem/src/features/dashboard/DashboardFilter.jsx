import { UndoOutlined } from "@ant-design/icons";
import { Button, Input, Select, Space } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { setFilters } from "../../state/qnSlice";

const { Search } = Input;
const { Option } = Select;

const DashboardFilter = ({
  data
}) => {
  const filters = useSelector((state) => state.qn.filters);
  const dispatch = useDispatch();

  const renderFilter = (field, label, width = 150) => {
    const uniqueValues = [...new Set(data.map((item) => item[field]))].filter(
      Boolean
    );
    return (
      <Select
        showSearch
        allowClear
        style={{ width }}
        placeholder={label}
        value={filters[field] || undefined}
        onChange={(value) =>
          dispatch(setFilters({[field]: value}))
        }
      >
        {uniqueValues.map((val) => (
          <Option key={val} value={val}>
            {val}
          </Option>
        ))}
      </Select>
    );
  };
  // eslint-disable-next-line no-unused-vars
  const resetFilters = () => {
    dispatch(setFilters({
      Rev: "",
      MQI: "",
      "Vendor": "",
      searchText: ""
    }));
  };

  return (
    <Space direction="horizontal" size="small">
      {renderFilter("Rev", "Filter by Revision")}
      {renderFilter("MQI", "Filter by MQI")}
      {renderFilter("Vendor", "Filter by Vendor", 170)}
      <Search
        placeholder="Search"
        allowClear
        value={filters.searchText}
        onChange={(e) => dispatch(setFilters({searchText: e.target.value }))}
        style={{ width: 200 }}
      />
      {/* <Button icon={<UndoOutlined />} onClick={resetFilters} /> */}
    </Space>
  );
};

export default DashboardFilter;
