using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace UnitTestProject1
{
    [TestClass]
    public class UnitTest1
    {
        [TestMethod]
        public void TestMethod1()
        {
            Sintu.Program d = new Sintu.Program();
            int i = d.mul(9, 6);
            Assert.AreEqual(54, i);
        }
    }
}
