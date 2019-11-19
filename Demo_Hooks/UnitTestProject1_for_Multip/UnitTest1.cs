using Microsoft.VisualStudio.TestTools.UnitTesting;
using Demo_Hooks;

namespace UnitTestProject1_for_Multip
{
    [TestClass]
    public class UnitTest1
    {
        [TestMethod]
        public void TestMethod1()
        {
            Multip m = new Multip();
            int res = m.multiplica(4, 5);
            Assert.AreEqual(21, res);
        }
    }
}
