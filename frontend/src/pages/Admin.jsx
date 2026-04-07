import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Heading,
  Button,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Switch,
  VStack,
  Alert,
  AlertIcon,
  Text,
  Icon,
  IconButton,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Select,
  Textarea,
} from "@chakra-ui/react";
import {
  getAdminUsers,
  getAdminProducts,
  getAdminProductHistory,
  deactivateUser,
  adminUpdateUser,
  getSelectors,
  createSelector,
  updateSelector,
  deleteSelector,
  getFirefoxSites,
  addFirefoxSite,
  deleteFirefoxSite,
  getMessageUsers,
  sendSystemMessage,
} from "../api";
import {
  UserX,
  Pencil,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getScrapeHealth } from "../api";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function Admin() {
  const [newFirefoxDomain, setNewFirefoxDomain] = useState("");
  const [firefoxError, setFirefoxError] = useState("");
  const [firefoxLoading, setFirefoxLoading] = useState(false);
  const [showAddSelector, setShowAddSelector] = useState(false);
  const [editingSelector, setEditingSelector] = useState(null);
  const [selectorForm, setSelectorForm] = useState({
    domain: "",
    selector: "",
    label: "",
    active: true,
  });
  const [selectorError, setSelectorError] = useState("");
  const [selectorLoading, setSelectorLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user: current_user } = useAuth();
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [broadcastForm, setBroadcastForm] = useState({
    recipient_id: "",
    subject: "",
    body: "",
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => getAdminUsers().then((r) => r.data),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["adminProducts"],
    queryFn: () => getAdminProducts().then((r) => r.data),
  });
  const { data: expandedHistory = [] } = useQuery({
    queryKey: ["adminHistory", expandedProduct],
    queryFn: () =>
      expandedProduct
        ? getAdminProductHistory(expandedProduct).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!expandedProduct,
  });
  const { data: selectors = [] } = useQuery({
    queryKey: ["selectors"],
    queryFn: () => getSelectors().then((r) => r.data),
  });
  const { data: messageUsers = [] } = useQuery({
    queryKey: ["messageUsers"],
    queryFn: () => getMessageUsers().then((r) => r.data),
  });
  const { data: firefoxSites = [] } = useQuery({
    queryKey: ["firefoxSites"],
    queryFn: () => getFirefoxSites().then((r) => r.data),
  });

  const { data: scrapeHealth = [] } = useQuery({
    queryKey: ["scrapeHealth"],
    queryFn: () => getScrapeHealth().then((r) => r.data),
    refetchInterval: 60000,
  });

  const expandedErrors = expandedHistory.filter((h) => h.error);

  const handleDeactivate = async (userId, username) => {
    if (!confirm(`Deactivate user ${username}?`)) return;
    await deactivateUser(userId);
    queryClient.invalidateQueries(["adminUsers"]);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email || "",
      is_admin: user.is_admin,
      is_super_admin: user.is_super_admin,
      active: user.active,
    });
    setEditError("");
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setEditError("");
    try {
      await adminUpdateUser(editingUser.id, editForm);
      queryClient.invalidateQueries(["adminUsers"]);
      setEditingUser(null);
    } catch (err) {
      setEditError(err.response?.data?.detail || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  const openAddSelector = () => {
    setSelectorForm({ domain: "", selector: "", label: "", active: true });
    setSelectorError("");
    setShowAddSelector(true);
  };

  const openEditSelector = (s) => {
    setEditingSelector(s);
    setSelectorForm({
      domain: s.domain,
      selector: s.selector,
      label: s.label || "",
      active: s.active,
    });
    setSelectorError("");
  };

  const handleSelectorSave = async () => {
    setSelectorLoading(true);
    setSelectorError("");
    try {
      if (editingSelector) {
        await updateSelector(editingSelector.id, selectorForm);
      } else {
        await createSelector(selectorForm);
      }
      queryClient.invalidateQueries(["selectors"]);
      setShowAddSelector(false);
      setEditingSelector(null);
    } catch (err) {
      setSelectorError(err.response?.data?.detail || "Failed to save selector");
    } finally {
      setSelectorLoading(false);
    }
  };

  const handleDeleteSelector = async (id) => {
    if (!confirm("Delete this selector?")) return;
    await deleteSelector(id);
    queryClient.invalidateQueries(["selectors"]);
  };

  const handleAddFirefoxSite = async () => {
    if (!newFirefoxDomain.trim()) return;
    setFirefoxLoading(true);
    setFirefoxError("");
    try {
      await addFirefoxSite({ domain: newFirefoxDomain.trim() });
      queryClient.invalidateQueries(["firefoxSites"]);
      setNewFirefoxDomain("");
    } catch (err) {
      setFirefoxError(err.response?.data?.detail || "Failed to add site");
    } finally {
      setFirefoxLoading(false);
    }
  };

  const handleDeleteFirefoxSite = async (id) => {
    if (!confirm("Remove this site?")) return;
    await deleteFirefoxSite(id);
    queryClient.invalidateQueries(["firefoxSites"]);
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.body.trim()) return;
    setBroadcastLoading(true);
    setBroadcastMsg(null);
    try {
      const res = await sendSystemMessage({
        recipient_id: broadcastForm.recipient_id
          ? parseInt(broadcastForm.recipient_id)
          : null,
        subject: broadcastForm.subject.trim() || undefined,
        body: broadcastForm.body.trim(),
      });
      setBroadcastMsg({
        type: "success",
        text: `Sent to ${res.data.sent} user${res.data.sent !== 1 ? "s" : ""}`,
      });
      setBroadcastForm({ recipient_id: "", subject: "", body: "" });
    } catch (err) {
      setBroadcastMsg({
        type: "error",
        text: err.response?.data?.detail || "Failed to send",
      });
    } finally {
      setBroadcastLoading(false);
    }
  };

  return (
    <Box maxW="1100px" mx="auto" px={6} py={8}>
      <Heading size="lg" mb={8}>
        Admin panel
      </Heading>

      <Box
        bg="white"
        _dark={{ bg: "gray.800" }}
        borderRadius="xl"
        boxShadow="sm"
        overflow="hidden"
      >
        <Tabs colorScheme="brand" px={2}>
          <TabList borderBottomColor="gray.100">
            <Tab fontSize="sm">Users ({users.length})</Tab>
            <Tab fontSize="sm">Products ({products.length})</Tab>
            <Tab fontSize="sm">Scrape health</Tab>
            <Tab fontSize="sm">Known selectors ({selectors.length})</Tab>
            <Tab fontSize="sm">Firefox sites ({firefoxSites.length})</Tab>
            <Tab fontSize="sm">Broadcast</Tab>
          </TabList>

          <TabPanels>
            {/* Users tab */}
            <TabPanel>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Username</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Joined</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map((u) => (
                    <Tr key={u.id}>
                      <Td fontWeight={500}>{u.username}</Td>
                      <Td color="gray.500">{u.email}</Td>
                      <Td>
                        <HStack spacing={1}>
                          {u.is_super_admin && (
                            <Badge colorScheme="purple">Super admin</Badge>
                          )}
                          {u.is_admin && !u.is_super_admin && (
                            <Badge colorScheme="blue">Admin</Badge>
                          )}
                          {!u.is_admin && !u.is_super_admin && (
                            <Text fontSize="xs" color="gray.400">
                              User
                            </Text>
                          )}
                        </HStack>
                      </Td>
                      <Td>
                        <Badge colorScheme={u.active ? "green" : "gray"}>
                          {u.active ? "Active" : "Inactive"}
                        </Badge>
                      </Td>
                      <Td fontSize="xs" color="gray.400">
                        {new Date(u.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button
                            size="xs"
                            colorScheme="brand"
                            variant="outline"
                            leftIcon={<Pencil size={11} />}
                            onClick={() => openEdit(u)}
                          >
                            Edit
                          </Button>
                          {u.active && !u.is_admin && !u.is_super_admin && (
                            <Button
                              size="xs"
                              colorScheme="red"
                              leftIcon={<UserX size={11} />}
                              onClick={() => handleDeactivate(u.id, u.username)}
                            >
                              Deactivate
                            </Button>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* Products tab */}
            <TabPanel>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>User</Th>
                    <Th>Sources</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {products.map((p) => (
                    <>
                      <Tr key={p.id}>
                        <Td fontWeight={500}>{p.name}</Td>
                        <Td color="gray.500" fontSize="xs">
                          {p.username}
                        </Td>
                        <Td>
                          <Badge colorScheme="purple" variant="subtle">
                            {p.source_count} source
                            {p.source_count !== 1 ? "s" : ""}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={p.active ? "green" : "gray"}>
                            {p.active ? "Active" : "Paused"}
                          </Badge>
                        </Td>
                        <Td>
                          <IconButton
                            size="xs"
                            variant="ghost"
                            colorScheme="brand"
                            icon={
                              expandedProduct === p.id ? (
                                <ChevronUp size={13} />
                              ) : (
                                <ChevronDown size={13} />
                              )
                            }
                            onClick={() =>
                              setExpandedProduct(
                                expandedProduct === p.id ? null : p.id,
                              )
                            }
                            aria-label="Show errors"
                          />
                        </Td>
                      </Tr>
                      {expandedProduct === p.id && (
                        <Tr key={`${p.id}-errors`}>
                          <Td
                            colSpan={5}
                            bg="gray.50"
                            _dark={{ bg: "gray.700" }}
                            p={4}
                          >
                            {expandedErrors.length === 0 ? (
                              <Text fontSize="sm" color="gray.400">
                                No scrape errors
                              </Text>
                            ) : (
                              <>
                                <HStack mb={2}>
                                  <Icon
                                    as={AlertCircle}
                                    color="red.400"
                                    boxSize={4}
                                  />
                                  <Text
                                    fontSize="sm"
                                    fontWeight={500}
                                    color="red.500"
                                  >
                                    {expandedErrors.length} error
                                    {expandedErrors.length !== 1 ? "s" : ""}
                                  </Text>
                                </HStack>
                                <Table size="sm">
                                  <Thead>
                                    <Tr>
                                      <Th>Time</Th>
                                      <Th>Error</Th>
                                    </Tr>
                                  </Thead>
                                  <Tbody>
                                    {expandedErrors
                                      .slice(-10)
                                      .reverse()
                                      .map((e) => (
                                        <Tr key={e.id}>
                                          <Td
                                            fontSize="xs"
                                            color="gray.400"
                                            whiteSpace="nowrap"
                                          >
                                            {new Date(
                                              e.scraped_at,
                                            ).toLocaleString()}
                                          </Td>
                                          <Td fontSize="sm" color="red.400">
                                            {e.error}
                                          </Td>
                                        </Tr>
                                      ))}
                                  </Tbody>
                                </Table>
                              </>
                            )}
                          </Td>
                        </Tr>
                      )}
                    </>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            <TabPanel>
              <Text fontSize="sm" color="gray.500" mb={4}>
                Success and failure rates per source based on the last 50
                scrapes. Sorted by success rate ascending.
              </Text>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Product</Th>
                    <Th>Source</Th>
                    <Th>Status</Th>
                    <Th>Success rate</Th>
                    <Th>Scrapes</Th>
                    <Th>Last scraped</Th>
                    <Th>Last error</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {scrapeHealth.map((s) => (
                    <Tr key={s.source_id}>
                      <Td fontWeight={500} fontSize="xs">
                        {s.product_name}
                      </Td>
                      <Td fontSize="xs">{s.source_label}</Td>
                      <Td>
                        <Badge
                          colorScheme={s.active ? "green" : "gray"}
                          fontSize="xs"
                        >
                          {s.active ? "Active" : "Paused"}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          {s.success_rate === 100 ? (
                            <Icon
                              as={CheckCircle}
                              color="green.400"
                              boxSize={4}
                            />
                          ) : s.success_rate >= 80 ? (
                            <Icon
                              as={AlertTriangle}
                              color="orange.400"
                              boxSize={4}
                            />
                          ) : (
                            <Icon as={XCircle} color="red.400" boxSize={4} />
                          )}
                          <Box
                            flex={1}
                            bg="gray.100"
                            _dark={{ bg: "gray.700" }}
                            borderRadius="full"
                            h="6px"
                            minW="80px"
                          >
                            <Box
                              bg={
                                s.success_rate === 100
                                  ? "green.400"
                                  : s.success_rate >= 80
                                    ? "orange.400"
                                    : "red.400"
                              }
                              borderRadius="full"
                              h="6px"
                              w={`${s.success_rate}%`}
                            />
                          </Box>
                          <Text fontSize="xs" fontWeight={500} minW="35px">
                            {s.success_rate}%
                          </Text>
                        </HStack>
                      </Td>
                      <Td fontSize="xs" color="gray.500">
                        {s.successes}/{s.total_scrapes}
                      </Td>
                      <Td fontSize="xs" color="gray.400">
                        {s.last_scraped_at
                          ? new Date(s.last_scraped_at).toLocaleString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "—"}
                      </Td>
                      <Td
                        fontSize="xs"
                        color="red.400"
                        maxW="200px"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                      >
                        {s.last_error || "—"}
                      </Td>
                    </Tr>
                  ))}
                  {scrapeHealth.length === 0 && (
                    <Tr>
                      <Td colSpan={7} color="gray.400" fontSize="sm">
                        No scrape data available
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TabPanel>

            {/* Known selectors tab */}
            <TabPanel>
              <HStack justify="space-between" mb={4}>
                <Text fontSize="sm" color="gray.500">
                  CSS selectors for known retailers — auto-applied when adding
                  sources
                </Text>
                {current_user?.is_super_admin && (
                  <Button
                    size="sm"
                    colorScheme="brand"
                    leftIcon={<Plus size={13} />}
                    onClick={openAddSelector}
                  >
                    Add selector
                  </Button>
                )}
              </HStack>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Domain</Th>
                    <Th>Selector</Th>
                    <Th>Label</Th>
                    <Th>Status</Th>
                    {current_user?.is_super_admin && <Th></Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {selectors.map((s) => (
                    <Tr key={s.id}>
                      <Td fontWeight={500}>{s.domain}</Td>
                      <Td fontFamily="mono" fontSize="xs">
                        {s.selector}
                      </Td>
                      <Td fontSize="xs" color="gray.500">
                        {s.label || "—"}
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={s.active ? "green" : "gray"}
                          fontSize="xs"
                        >
                          {s.active ? "Active" : "Inactive"}
                        </Badge>
                      </Td>
                      {current_user?.is_super_admin && (
                        <Td>
                          <HStack spacing={1}>
                            <IconButton
                              size="xs"
                              variant="ghost"
                              colorScheme="brand"
                              icon={<Pencil size={11} />}
                              onClick={() => openEditSelector(s)}
                              aria-label="Edit"
                            />
                            <IconButton
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              icon={<Trash2 size={11} />}
                              onClick={() => handleDeleteSelector(s.id)}
                              aria-label="Delete"
                            />
                          </HStack>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* Firefox sites tab */}
            <TabPanel>
              <Text fontSize="sm" color="gray.500" mb={4}>
                Sites scraped using Firefox instead of Chromium — use for sites
                that block headless Chromium.
              </Text>
              {firefoxError && (
                <Alert status="error" borderRadius="md" mb={3}>
                  <AlertIcon />
                  {firefoxError}
                </Alert>
              )}
              <Table size="sm" mb={4}>
                <Thead>
                  <Tr>
                    <Th>Domain</Th>
                    <Th>Added</Th>
                    {current_user?.is_super_admin && <Th></Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {firefoxSites.length === 0 && (
                    <Tr>
                      <Td colSpan={3} color="gray.400" fontSize="sm">
                        No sites configured
                      </Td>
                    </Tr>
                  )}
                  {firefoxSites.map((s) => (
                    <Tr key={s.id}>
                      <Td fontWeight={500}>{s.domain}</Td>
                      <Td fontSize="xs" color="gray.400">
                        {new Date(s.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Td>
                      {current_user?.is_super_admin && (
                        <Td>
                          <IconButton
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            icon={<Trash2 size={11} />}
                            onClick={() => handleDeleteFirefoxSite(s.id)}
                            aria-label="Delete"
                          />
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {current_user?.is_super_admin && (
                <HStack>
                  <Input
                    value={newFirefoxDomain}
                    onChange={(e) => setNewFirefoxDomain(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddFirefoxSite()
                    }
                    placeholder="e.g. argos.co.uk"
                    focusBorderColor="brand.500"
                    size="sm"
                    maxW="300px"
                  />
                  <Button
                    size="sm"
                    colorScheme="brand"
                    leftIcon={<Plus size={13} />}
                    isLoading={firefoxLoading}
                    onClick={handleAddFirefoxSite}
                  >
                    Add
                  </Button>
                </HStack>
              )}
            </TabPanel>

            {/* Broadcast tab */}
            <TabPanel>
              <Text fontSize="sm" color="gray.500" mb={4}>
                Send a system message to one user or all users at once.
              </Text>
              {broadcastMsg && (
                <Alert status={broadcastMsg.type} borderRadius="md" mb={4}>
                  <AlertIcon />
                  {broadcastMsg.text}
                </Alert>
              )}
              <form onSubmit={handleBroadcast}>
                <VStack spacing={4} align="stretch" maxW="500px">
                  <FormControl>
                    <FormLabel fontSize="sm">Recipient</FormLabel>
                    <Select
                      value={broadcastForm.recipient_id}
                      onChange={(e) =>
                        setBroadcastForm({
                          ...broadcastForm,
                          recipient_id: e.target.value,
                        })
                      }
                      focusBorderColor="brand.500"
                    >
                      <option value="">All users</option>
                      {messageUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Subject</FormLabel>
                    <Input
                      value={broadcastForm.subject}
                      onChange={(e) =>
                        setBroadcastForm({
                          ...broadcastForm,
                          subject: e.target.value,
                        })
                      }
                      placeholder="Optional"
                      focusBorderColor="brand.500"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Message</FormLabel>
                    <Textarea
                      value={broadcastForm.body}
                      onChange={(e) =>
                        setBroadcastForm({
                          ...broadcastForm,
                          body: e.target.value,
                        })
                      }
                      rows={4}
                      focusBorderColor="brand.500"
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    colorScheme="brand"
                    alignSelf="flex-start"
                    isLoading={broadcastLoading}
                  >
                    Send message
                  </Button>
                </VStack>
              </form>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Add/edit selector modal */}
      {(showAddSelector || editingSelector) && (
        <Modal
          isOpen
          onClose={() => {
            setShowAddSelector(false);
            setEditingSelector(null);
          }}
        >
          <ModalOverlay />
          <ModalContent borderRadius="xl">
            <ModalHeader>
              {editingSelector ? "Edit selector" : "Add selector"}
            </ModalHeader>
            <ModalBody>
              <VStack spacing={4}>
                {selectorError && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {selectorError}
                  </Alert>
                )}
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Domain</FormLabel>
                  <Input
                    value={selectorForm.domain}
                    onChange={(e) =>
                      setSelectorForm({
                        ...selectorForm,
                        domain: e.target.value,
                      })
                    }
                    placeholder="amazon.co.uk"
                    focusBorderColor="brand.500"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Selector</FormLabel>
                  <Input
                    value={selectorForm.selector}
                    onChange={(e) =>
                      setSelectorForm({
                        ...selectorForm,
                        selector: e.target.value,
                      })
                    }
                    placeholder=".a-offscreen"
                    focusBorderColor="brand.500"
                    fontFamily="mono"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Label</FormLabel>
                  <Input
                    value={selectorForm.label}
                    onChange={(e) =>
                      setSelectorForm({
                        ...selectorForm,
                        label: e.target.value,
                      })
                    }
                    placeholder="Main price"
                    focusBorderColor="brand.500"
                  />
                </FormControl>
                <FormControl
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <FormLabel fontSize="sm" mb={0}>
                    Active
                  </FormLabel>
                  <Switch
                    isChecked={selectorForm.active}
                    onChange={(e) =>
                      setSelectorForm({
                        ...selectorForm,
                        active: e.target.checked,
                      })
                    }
                    colorScheme="brand"
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter gap={3}>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddSelector(false);
                  setEditingSelector(null);
                }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="brand"
                isLoading={selectorLoading}
                onClick={handleSelectorSave}
              >
                {editingSelector ? "Save changes" : "Add selector"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Edit user modal */}
      {editingUser && (
        <Modal isOpen onClose={() => setEditingUser(null)}>
          <ModalOverlay />
          <ModalContent borderRadius="xl">
            <ModalHeader>Edit user — {editingUser.username}</ModalHeader>
            <ModalBody>
              <VStack spacing={4}>
                {editError && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {editError}
                  </Alert>
                )}
                <FormControl>
                  <FormLabel fontSize="sm">Username</FormLabel>
                  <Input
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    focusBorderColor="brand.500"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Email</FormLabel>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    focusBorderColor="brand.500"
                  />
                </FormControl>
                <FormControl
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <FormLabel fontSize="sm" mb={0}>
                    Admin access
                  </FormLabel>
                  <Switch
                    isChecked={editForm.is_admin}
                    onChange={(e) =>
                      setEditForm({ ...editForm, is_admin: e.target.checked })
                    }
                    colorScheme="brand"
                  />
                </FormControl>
                {current_user?.is_super_admin && (
                  <FormControl
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <FormLabel fontSize="sm" mb={0}>
                      Super admin
                    </FormLabel>
                    <Switch
                      isChecked={editForm.is_super_admin}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          is_super_admin: e.target.checked,
                        })
                      }
                      colorScheme="purple"
                    />
                  </FormControl>
                )}
                <FormControl
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <FormLabel fontSize="sm" mb={0}>
                    Active
                  </FormLabel>
                  <Switch
                    isChecked={editForm.active}
                    onChange={(e) =>
                      setEditForm({ ...editForm, active: e.target.checked })
                    }
                    colorScheme="brand"
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter gap={3}>
              <Button variant="ghost" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                colorScheme="brand"
                isLoading={editLoading}
                onClick={handleEditSave}
              >
                Save changes
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}
