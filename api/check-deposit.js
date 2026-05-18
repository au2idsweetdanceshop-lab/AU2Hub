module.exports = async (req, res) => {
  try {
    const { nominal } = req.body;
    
    // Ini link Apps Script milikmu yang tadi
    const GAS_URL = "https://script.google.com/macros/s/AKfycbyahi5GUD2kdoGWF2XxIBcWDrK2gfNYH0tphVRURwKSKac1KcO0K4KK3PQsiPNUqQKFeQ/exec"; 

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "CEK_STATUS",
        nominal: nominal
      })
    });

    const result = await response.json();
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
};
